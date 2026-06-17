import { eq } from "drizzle-orm";
import { moderatorActionType } from "../moderatorActions/moderatorActionHelpers";
import { createModeratorAction } from "../moderatorActions/moderatorActionMutations";
import { createNotifications } from "../notifications/notificationMutations";
import { users, Conversation, Message } from "../schema";
import { userIsAdmin } from "../users/userHelpers";
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
  // If the participants didn't change we can ignore it
  if (!currentConversation.participantIds) {
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
    void createModeratorAction(
      null,
      currentUser._id,
      moderatorActionType("flaggedForNDMs"),
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
    throw new Error(
      `You cannot message more than ${MAX_ALLOWED_CONTACTS_BEFORE_BLOCK} users before your account has been reviewed. Please contact us if you'd like to message more people.`,
    );
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
    void createModeratorAction(
      null,
      nonAdminParticipant._id,
      moderatorActionType("sentModeratorMessage"),
      new Date(),
    );
  }
};

export const sendMessageNotifications = async (
  conversation: Conversation,
  message: Message,
) => {
  // For on-site notifications, notify everyone except the sender of the
  // message. For email notifications, notify everyone including the sender
  // (since if there's a back-and-forth in the grouped notifications, you want
  // to see your own messages).
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
