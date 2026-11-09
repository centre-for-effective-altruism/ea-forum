import { waitUntil } from "@vercel/functions";
import difference from "lodash/difference";
import escape from "lodash/escape";
import isEqual from "lodash/isEqual";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { moderatorActionType } from "../moderatorActions/moderatorActionHelpers";
import { createModeratorAction } from "../moderatorActions/moderatorActionMutations";
import { createNotifications } from "../notifications/notificationMutations";
import { users, Conversation, Message } from "../schema";
import { userGetDisplayName, userIsAdmin } from "../users/userHelpers";
import { fetchAdminAccount } from "../users/adminAccount";
import { createMessage } from "./messageMutations";
import { filterNonNull } from "../typeHelpers";
import { db, DbOrTransaction } from "../db";
import type { CurrentUser } from "../users/currentUser";

/** The max # of users an unapproved account is allowed to DM before being flagged */
const MAX_ALLOWED_CONTACTS_BEFORE_FLAG = 2;

/** The max # of users an unapproved account is allowed to DM */
const MAX_ALLOWED_CONTACTS_BEFORE_BLOCK = 4;

/**
 * Before a user has been fully approved, keep track of the number of users
 * they've started a conversation with. If they've messaged more than N, flag
 * them for review. If they've messaged more than M, block them from messaging
 * anyone else.
 *
 * In the case where a user should be blocked, this will throw an error, so we
 * should make sure to handle that on the frontend.
 */
export const flagOrBlockUserOnManyDMs = async ({
  db,
  currentConversation,
  oldConversation,
  currentUser,
}: {
  db: DbOrTransaction;
  currentConversation: Conversation;
  oldConversation?: Conversation;
  currentUser: CurrentUser;
}): Promise<void> => {
  // User is fully approved
  if (currentUser.reviewedByUserId && !currentUser.snoozedUntilContentCount) {
    return;
  }
  if (
    oldConversation &&
    isEqual(
      new Set(oldConversation.participantIds),
      new Set(currentConversation.participantIds),
    )
  ) {
    return;
  }

  const user = await db.query.users.findFirst({
    columns: {
      usersContactedBeforeReview: true,
    },
    where: {
      _id: currentUser._id,
    },
  });

  const allUsersEverContacted = filterNonNull(
    [
      ...new Set([
        ...currentConversation.participantIds,
        ...(oldConversation?.participantIds ?? []),
        ...(user?.usersContactedBeforeReview ?? []),
      ]),
    ].filter((id) => id !== currentUser._id),
  );

  // Flag users that have sent N+ DMs if they've never been reviewed
  if (
    allUsersEverContacted.length > MAX_ALLOWED_CONTACTS_BEFORE_FLAG &&
    !currentUser.reviewedAt
  ) {
    waitUntil(
      createModeratorAction(
        null,
        currentUser._id,
        moderatorActionType("flaggedForNDMs"),
      ),
    );
  }

  await db
    .update(users)
    .set({
      usersContactedBeforeReview: allUsersEverContacted,
    })
    .where(eq(users._id, currentUser._id));

  if (
    allUsersEverContacted.length > MAX_ALLOWED_CONTACTS_BEFORE_BLOCK &&
    !currentUser.reviewedAt
  ) {
    throw new ORPCError("FORBIDDEN", {
      message: `You cannot message more than ${MAX_ALLOWED_CONTACTS_BEFORE_BLOCK} users before your account has been reviewed. Please contact us if you'd like to message more people.`,
    });
  }
};

/**
 * Creates a moderator action when the first message in a mod conversation is
 * sent to the user. This also adds a note to a user's sunshineNotes.
 */
export const updateUserNotesOnModMessage = async (conversation: Conversation) => {
  if (!conversation.moderator) {
    return;
  }

  const [participants, messages] = await Promise.all([
    db.query.users.findMany({
      columns: {
        _id: true,
        isAdmin: true,
      },
      where: {
        _id: { in: conversation.participantIds },
      },
    }),
    db.query.messages.findMany({
      columns: {
        _id: true,
      },
      where: {
        conversationId: conversation._id,
      },
    }),
  ]);

  const nonAdminParticipant = participants.find((user) => !userIsAdmin(user));

  if (nonAdminParticipant && messages.length === 1) {
    waitUntil(
      createModeratorAction(
        null,
        nonAdminParticipant._id,
        moderatorActionType("sentModeratorMessage"),
        new Date(),
      ),
    );
  }
};

export const sendMessageNotifications = async (
  conversation: Conversation,
  message: Message,
) => {
  const recipientIds = conversation.participantIds.filter(
    (id) => id !== message.userId,
  );

  await createNotifications({
    userIds: recipientIds,
    notificationType: "newMessage",
    documentType: "message",
    documentId: message._id,
    noEmail: message.noEmail,
  });
};

export const sendUserLeftConversationMessages = async (
  conversation: Conversation,
  oldConversation: Conversation,
) => {
  const leftUserIds = difference(
    oldConversation.participantIds,
    conversation.participantIds,
  );
  if (!leftUserIds.length) {
    return;
  }
  const [admin, leftUsers] = await Promise.all([
    fetchAdminAccount(),
    db.query.users.findMany({
      columns: { _id: true, displayName: true, username: true },
      where: { _id: { in: leftUserIds } },
    }),
  ]);
  for (const leftUser of leftUsers) {
    await createMessage({
      user: admin,
      editorData: {
        originalContents: {
          type: "html",
          data: `<p>User ${escape(userGetDisplayName(leftUser))} left the conversation.</p>`,
        },
        updateType: "initial",
        commitMessage: "",
      },
      conversation,
      noEmail: true,
    });
  }
};

/**
 * Notify newly added participants (other than the user who added them) of the
 * latest message. If there are no messages yet they'll be notified when the
 * first one is sent.
 */
export const notifyNewConversationParticipants = async (
  conversation: Conversation,
  oldConversation: Conversation,
  currentUser: CurrentUser,
) => {
  const newParticipantIds = difference(
    conversation.participantIds,
    oldConversation.participantIds,
  ).filter((id) => id !== currentUser._id);
  if (!newParticipantIds.length) {
    return;
  }
  const latestMessage = await db.query.messages.findFirst({
    columns: { _id: true, noEmail: true },
    where: { conversationId: conversation._id },
    orderBy: { createdAt: "desc" },
  });
  if (latestMessage) {
    await createNotifications({
      userIds: newParticipantIds,
      notificationType: "newMessage",
      documentType: "message",
      documentId: latestMessage._id,
      noEmail: latestMessage.noEmail,
    });
  }
};
