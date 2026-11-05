import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { db } from "@/lib/db";
import { messagesRouter } from "@/lib/messages/messagesRouter";
import { createMessage } from "@/lib/messages/messageMutations";
import {
  conversationGetTitle,
  getDraftMessageHtml,
} from "@/lib/messages/messageHelpers";
import { isNewSiteAllowed } from "@/lib/proxy/legacySiteRedirect";
import type { EditorData } from "@/lib/ckeditor/editorHelpers";
import { eq } from "drizzle-orm";
import { messages, type User } from "@/lib/schema";
import { flagOrBlockUserOnManyDMs } from "@/lib/messages/messageCallbacks";
import { sendModerationPM } from "@/lib/messages/sendModerationPM";
import { fetchCommentsListItem } from "@/lib/comments/commentLists";
import { randomId } from "@/lib/utils/random";
import {
  createTestComment,
  createTestConversation,
  createTestMessage,
  createTestUser,
} from "./testHelpers";

const MOCK_ADMIN_EMAIL = "inbox-mock-admin-email";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const pendingWork = vi.hoisted(() => [] as Promise<unknown>[]);

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

vi.mock(import("@vercel/functions"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    waitUntil: (promise: Promise<unknown>) => {
      pendingWork.push(promise);
    },
  };
});

const flushBackgroundWork = async () => {
  while (pendingWork.length) {
    await Promise.all(pendingWork.splice(0));
  }
};

const fetchConversation = (conversationId: string) =>
  db.query.conversations.findFirst({ where: { _id: conversationId } });

const editorData = (html: string): EditorData => ({
  originalContents: { type: "ckEditorMarkup", data: html },
  updateType: "initial",
  commitMessage: "",
});

const loginAs = (user: User) => mockGetCurrentUser.mockResolvedValue(user);

const fetchAdminUser = async () =>
  (await db.query.users.findFirst({ where: { email: MOCK_ADMIN_EMAIL } })) ??
  (await createTestUser({ isAdmin: true, email: MOCK_ADMIN_EMAIL }));

const createConversationWithMessage = async ({
  participantIds,
  sentAt,
  ...data
}: {
  participantIds: string[];
  sentAt?: string;
  moderator?: boolean;
}) => {
  const conversation = await createTestConversation({ participantIds, ...data });
  await createTestMessage({
    conversationId: conversation._id,
    userId: participantIds[0],
    ...(sentAt && { createdAt: sentAt }),
  });
  return conversation;
};

const ids = (items: { _id: string }[]) => items.map(({ _id }) => _id);

const sendMessageAs = async (
  user: User,
  conversationId: string,
  options?: { noEmail?: boolean },
) => {
  loginAs(user);
  const message = await call(messagesRouter.sendMessage, {
    conversationId,
    editorData: editorData("<p>Hello</p>"),
    ...options,
  });
  await flushBackgroundWork();
  return message;
};

suite("Inbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_ACCOUNT_EMAIL", MOCK_ADMIN_EMAIL);
  });

  test.each([
    "/inbox",
    "/inbox/abc123",
    "/moderatorInbox",
    "/moderatorInbox/abc123",
    "/message/some-user",
  ])("%s is served by the new site", (path) => {
    expect(isNewSiteAllowed(path)).toBe(true);
  });

  suite("listing conversations", () => {
    test("lists the user's conversations with messages, most recently active first", async () => {
      const [user, other] = await Promise.all([createTestUser(), createTestUser()]);
      const older = await createConversationWithMessage({
        participantIds: [other._id, user._id],
        sentAt: "2024-01-01T00:00:00.000Z",
      });
      const newer = await createConversationWithMessage({
        participantIds: [other._id, user._id],
        sentAt: "2024-03-01T00:00:00.000Z",
      });
      const moderatorConversation = await createConversationWithMessage({
        participantIds: [other._id, user._id],
        sentAt: "2024-02-01T00:00:00.000Z",
        moderator: true,
      });
      await createTestConversation({ participantIds: [other._id, user._id] });
      await createConversationWithMessage({ participantIds: [other._id] });

      loginAs(user);
      const { items } = await call(messagesRouter.listConversations, {});
      expect(ids(items)).toStrictEqual([
        newer._id,
        moderatorConversation._id,
        older._id,
      ]);
      expect(ids(items[0].participants).toSorted()).toStrictEqual(
        [user._id, other._id].toSorted(),
      );
      expect(items[0].latestMessage?.previewText).toBe("Test message");
    });

    test("the moderator inbox is only available to moderators", async () => {
      loginAs(await createTestUser());
      await expect(
        call(messagesRouter.listConversations, { moderator: true }),
      ).rejects.toThrow("Permission denied");
    });

    test("the moderator inbox lists moderator conversations, optionally filtered by user", async () => {
      const [mod, user, otherUser] = await Promise.all([
        createTestUser({ groups: ["sunshineRegiment"] }),
        createTestUser(),
        createTestUser(),
      ]);
      const userModConversation = await createConversationWithMessage({
        participantIds: [user._id],
        moderator: true,
      });
      const otherModConversation = await createConversationWithMessage({
        participantIds: [otherUser._id],
        moderator: true,
      });
      const normalConversation = await createConversationWithMessage({
        participantIds: [user._id],
      });
      const emptyModConversation = await createTestConversation({
        participantIds: [user._id],
        moderator: true,
      });

      loginAs(mod);
      const all = await call(messagesRouter.listConversations, {
        moderator: true,
        limit: 50,
      });
      expect(ids(all.items)).toEqual(
        expect.arrayContaining([userModConversation._id, otherModConversation._id]),
      );
      expect(ids(all.items)).not.toContain(normalConversation._id);
      expect(ids(all.items)).not.toContain(emptyModConversation._id);

      const filtered = await call(messagesRouter.listConversations, {
        moderator: true,
        userId: user._id,
      });
      expect(ids(filtered.items)).toStrictEqual([userModConversation._id]);
    });
  });

  suite("viewing a conversation", () => {
    test("is allowed for participants and moderators but not other users", async () => {
      const [participant, other, stranger, mod] = await Promise.all([
        createTestUser(),
        createTestUser(),
        createTestUser(),
        createTestUser({ groups: ["sunshineRegiment"] }),
      ]);
      const conversation = await createTestConversation({
        participantIds: [participant._id, other._id],
      });
      const first = await createTestMessage({
        conversationId: conversation._id,
        userId: other._id,
        createdAt: "2024-01-01T00:00:00.000Z",
      });
      const second = await createTestMessage({
        conversationId: conversation._id,
        userId: participant._id,
        createdAt: "2024-01-02T00:00:00.000Z",
      });
      const getConversation = () =>
        call(messagesRouter.getConversation, { conversationId: conversation._id });

      loginAs(participant);
      const result = await getConversation();
      expect(ids(result?.messages ?? [])).toStrictEqual([first._id, second._id]);
      expect(result?.messages[0].user?._id).toBe(other._id);

      loginAs(mod);
      expect(await getConversation()).not.toBeNull();

      loginAs(stranger);
      expect(await getConversation()).toBeNull();
    });
  });

  suite("unread state", () => {
    test("new messages are unread until the conversation is marked read", async () => {
      const [sender, recipient] = await Promise.all([
        createTestUser({ karma: 100 }),
        createTestUser(),
      ]);
      const conversation = await createTestConversation({
        participantIds: [sender._id, recipient._id],
      });
      await sendMessageAs(sender, conversation._id);

      const fetchRecipientState = async () => {
        loginAs(recipient);
        const [{ items }, unreadCount] = await Promise.all([
          call(messagesRouter.listConversations, {}),
          call(messagesRouter.unreadCount, undefined),
        ]);
        return { hasUnreadMessages: items[0].hasUnreadMessages, unreadCount };
      };

      expect(await fetchRecipientState()).toStrictEqual({
        hasUnreadMessages: true,
        unreadCount: 1,
      });

      loginAs(sender);
      const { items: senderItems } = await call(
        messagesRouter.listConversations,
        {},
      );
      expect(senderItems[0].hasUnreadMessages).toBe(false);

      loginAs(recipient);
      await call(messagesRouter.markConversationRead, {
        conversationId: conversation._id,
      });
      expect(await fetchRecipientState()).toStrictEqual({
        hasUnreadMessages: false,
        unreadCount: 0,
      });
    });

    test("unread count is per conversation and ignores notifications for deleted messages", async () => {
      const [sender, recipient] = await Promise.all([
        createTestUser({ karma: 100 }),
        createTestUser(),
      ]);
      const conversation = await createTestConversation({
        participantIds: [sender._id, recipient._id],
      });
      await sendMessageAs(sender, conversation._id);
      await sendMessageAs(sender, conversation._id);

      loginAs(recipient);
      expect(await call(messagesRouter.unreadCount, undefined)).toBe(1);

      await db.delete(messages).where(eq(messages.conversationId, conversation._id));
      expect(await call(messagesRouter.unreadCount, undefined)).toBe(0);
    });
  });

  suite("sending messages", () => {
    test("increments the conversation's message count", async () => {
      const [sender, recipient] = await Promise.all([
        createTestUser(),
        createTestUser(),
      ]);
      const conversation = await createTestConversation({
        participantIds: [sender._id, recipient._id],
      });
      await createMessage({
        user: sender,
        editorData: editorData("<p>Hello</p>"),
        conversation,
      });
      await createMessage({
        user: sender,
        editorData: editorData("<p>Again</p>"),
        conversation,
      });
      await flushBackgroundWork();
      const updated = await fetchConversation(conversation._id);
      expect(updated?.messageCount).toBe(2);
    });

    test("low karma users can reply but can't send the first message", async () => {
      const [lowKarmaUser, other] = await Promise.all([
        createTestUser({ karma: 0 }),
        createTestUser(),
      ]);
      const emptyConversation = await createTestConversation({
        participantIds: [lowKarmaUser._id, other._id],
      });
      await expect(
        sendMessageAs(lowKarmaUser, emptyConversation._id),
      ).rejects.toThrow("You must earn 10 karma to start a conversation");

      const existingConversation = await createConversationWithMessage({
        participantIds: [other._id, lowKarmaUser._id],
      });
      const message = await sendMessageAs(lowKarmaUser, existingConversation._id);
      expect(message?.userId).toBe(lowKarmaUser._id);
    });

    test("non-participants can't send messages unless they're admins", async () => {
      const [participant, stranger, admin] = await Promise.all([
        createTestUser(),
        createTestUser({ karma: 100 }),
        createTestUser({ isAdmin: true }),
      ]);
      const conversation = await createConversationWithMessage({
        participantIds: [participant._id],
      });
      await expect(sendMessageAs(stranger, conversation._id)).rejects.toThrow(
        "Permission denied",
      );
      await sendMessageAs(admin, conversation._id);
      const updated = await fetchConversation(conversation._id);
      expect(updated?.participantIds).toContain(admin._id);
    });

    test("only admins can send messages without email notifications", async () => {
      const [user, admin, recipient] = await Promise.all([
        createTestUser({ karma: 100 }),
        createTestUser({ isAdmin: true }),
        createTestUser(),
      ]);
      const conversation = await createTestConversation({
        participantIds: [user._id, admin._id, recipient._id],
      });
      const userMessage = await sendMessageAs(user, conversation._id, {
        noEmail: true,
      });
      const adminMessage = await sendMessageAs(admin, conversation._id, {
        noEmail: true,
      });
      const noEmailById = Object.fromEntries(
        (
          await db.query.messages.findMany({
            columns: { _id: true, noEmail: true },
            where: { conversationId: conversation._id },
          })
        ).map(({ _id, noEmail }) => [_id, noEmail]),
      );
      expect(noEmailById[userMessage!._id]).toBe(false);
      expect(noEmailById[adminMessage!._id]).toBe(true);
    });
  });

  suite("updating a conversation", () => {
    test("only moderators can change the moderator flag", async () => {
      const [user, mod] = await Promise.all([
        createTestUser(),
        createTestUser({ groups: ["sunshineRegiment"] }),
      ]);
      const conversation = await createTestConversation({
        participantIds: [user._id, mod._id],
      });
      const setModerator = () =>
        call(messagesRouter.updateConversation, {
          conversationId: conversation._id,
          moderator: true,
        });

      loginAs(user);
      await expect(setModerator()).rejects.toThrow(
        "Only moderators can change the moderator status",
      );

      loginAs(mod);
      const updated = await setModerator();
      expect(updated?.moderator).toBe(true);
    });

    test("non-participants can't edit unless they're admins", async () => {
      const [participant, stranger, admin] = await Promise.all([
        createTestUser(),
        createTestUser(),
        createTestUser({ isAdmin: true }),
      ]);
      const conversation = await createTestConversation({
        participantIds: [participant._id],
      });
      const rename = (title: string) =>
        call(messagesRouter.updateConversation, {
          conversationId: conversation._id,
          title,
        });

      loginAs(stranger);
      await expect(rename("Stranger")).rejects.toThrow("Permission denied");

      loginAs(admin);
      await rename("Admin");
      expect((await fetchConversation(conversation._id))?.title).toBe("Admin");
    });

    test("removed participants get a left message and added participants are notified", async () => {
      const [admin, editor, leaver, added] = await Promise.all([
        fetchAdminUser(),
        createTestUser(),
        createTestUser({ displayName: "Leaving <User>" }),
        createTestUser(),
      ]);
      const conversation = await createConversationWithMessage({
        participantIds: [editor._id, leaver._id],
      });

      loginAs(editor);
      await call(messagesRouter.updateConversation, {
        conversationId: conversation._id,
        participantIds: [editor._id, added._id],
      });
      await flushBackgroundWork();

      const leftMessage = await db.query.messages.findFirst({
        where: { conversationId: conversation._id, userId: admin._id },
      });
      expect(leftMessage?.noEmail).toBe(true);
      expect(leftMessage?.contents?.html).toContain(
        "User Leaving &lt;User&gt; left the conversation.",
      );

      const notifiedUserIds = (
        await db.query.notifications.findMany({
          columns: { userId: true },
          where: {
            type: "newMessage",
            userId: { in: [editor._id, leaver._id, added._id] },
          },
        })
      ).map(({ userId }) => userId);
      expect(notifiedUserIds).toContain(added._id);
      expect(notifiedUserIds).not.toContain(leaver._id);
    });
  });

  suite("unreviewed DM limits", () => {
    const createUnreviewedUserAtContactLimit = () =>
      createTestUser({
        reviewedByUserId: null,
        usersContactedBeforeReview: [1, 2, 3, 4, 5].map(() => randomId()),
      });

    test("doesn't re-check limits when the participants are unchanged", async () => {
      const user = await createUnreviewedUserAtContactLimit();
      const conversation = await createTestConversation({
        participantIds: [user._id, randomId()],
      });
      await expect(
        flagOrBlockUserOnManyDMs({
          db,
          currentConversation: { ...conversation, title: "Renamed" },
          oldConversation: conversation,
          currentUser: user,
        }),
      ).resolves.toBeUndefined();
    });

    test("blocks when the participants change", async () => {
      const user = await createUnreviewedUserAtContactLimit();
      const conversation = await createTestConversation({
        participantIds: [user._id, randomId()],
      });
      await expect(
        flagOrBlockUserOnManyDMs({
          db,
          currentConversation: {
            ...conversation,
            participantIds: [...conversation.participantIds, randomId()],
          },
          oldConversation: conversation,
          currentUser: user,
        }),
      ).rejects.toThrow(/before your account has been reviewed/);
      await flushBackgroundWork();
    });
  });

  suite("createConversation", () => {
    test("rejects users with messaging disabled", async () => {
      const [user, recipient] = await Promise.all([
        createTestUser({ karma: 100, conversationsDisabled: true }),
        createTestUser(),
      ]);
      loginAs(user);
      await expect(
        call(messagesRouter.createConversation, { userIds: [recipient._id] }),
      ).rejects.toThrow("You are not allowed to send messages");
    });

    test("reuses an existing conversation with the same participants", async () => {
      const [user, recipient] = await Promise.all([
        createTestUser({ karma: 100 }),
        createTestUser(),
      ]);
      loginAs(user);
      const create = (includeModerators?: boolean) =>
        call(messagesRouter.createConversation, {
          userIds: [recipient._id],
          includeModerators,
        });
      const conversationId = await create();
      await flushBackgroundWork();
      expect(await create()).toBe(conversationId);
      expect(await create(true)).not.toBe(conversationId);
      await flushBackgroundWork();
    });
  });

  suite("moderation PMs", () => {
    test("omits the content title when there isn't one", async () => {
      const [admin, author] = await Promise.all([
        fetchAdminUser(),
        createTestUser(),
      ]);
      const { _id: commentId } = await createTestComment({ userId: author._id });
      const comment = await fetchCommentsListItem({ currentUser: admin, commentId });
      if (!comment) {
        throw new Error("Comment not found");
      }
      await sendModerationPM({
        action: "deleted",
        messageContents: "<p>Removed</p>",
        comment,
        noEmail: true,
        contentTitle: null,
      });
      await flushBackgroundWork();
      const conversation = await db.query.conversations.findFirst({
        where: { participantIds: { arrayContains: [author._id] } },
      });
      expect(conversation?.title).toBe("Comment deleted");
    });
  });

  suite("conversationGetFriendlyTitle", () => {
    const participants = ["Me", "Alice", "Bob", "Carol", "Dave"].map(
      (displayName) => ({ _id: displayName, displayName, username: null }),
    );
    const titleWith = (count: number, title: string | null = null) =>
      conversationGetTitle(
        { title, participants: participants.slice(0, count + 1) },
        "Me",
      );

    test.each([
      [0, "Conversation"],
      [1, "Alice"],
      [2, "Alice and Bob"],
      [3, "Alice, Bob + 1 more"],
      [4, "Alice, Bob + 2 more"],
    ])("with %i other participants is %s", (count, expected) => {
      expect(titleWith(count)).toBe(expected);
    });

    test("prefers the conversation's title", () => {
      expect(titleWith(2, "Custom")).toBe("Custom");
    });
  });

  suite("getDraftMessageHtml", () => {
    test("strips moderator notes and fills in the recipient's name", () => {
      expect(
        getDraftMessageHtml({
          html: "<p>Mod note</p>\\\\<p>Hi {{firstName}} ({{displayName}})</p>",
          displayName: "Jane Doe",
        }),
      ).toBe("<p>Hi Jane (Jane Doe)</p>");
    });
  });
});
