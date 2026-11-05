import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { db } from "@/lib/db";
import { messagesRouter } from "@/lib/messages/messagesRouter";
import { createMessage } from "@/lib/messages/messageMutations";
import { flagOrBlockUserOnManyDMs } from "@/lib/messages/messageCallbacks";
import { sendModerationPM } from "@/lib/messages/sendModerationPM";
import { fetchCommentsListItem } from "@/lib/comments/commentLists";
import { randomId } from "@/lib/utils/random";
import {
  createTestComment,
  createTestConversation,
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

suite("Inbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_ACCOUNT_EMAIL", MOCK_ADMIN_EMAIL);
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
        html: "<p>Hello</p>",
        conversation,
      });
      await createMessage({
        user: sender,
        html: "<p>Again</p>",
        conversation,
      });
      await flushBackgroundWork();
      const updated = await fetchConversation(conversation._id);
      expect(updated?.messageCount).toBe(2);
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
      mockGetCurrentUser.mockResolvedValue(user);
      await expect(
        call(messagesRouter.createConversation, { userIds: [recipient._id] }),
      ).rejects.toThrow("You are not allowed to send messages");
    });
  });

  suite("moderation PMs", () => {
    test("omits the content title when there isn't one", async () => {
      const [admin, author] = await Promise.all([
        createTestUser({ isAdmin: true, email: MOCK_ADMIN_EMAIL }),
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
});
