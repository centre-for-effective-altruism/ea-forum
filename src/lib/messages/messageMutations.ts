import { waitUntil } from "@vercel/functions";
import uniq from "lodash/uniq";
import { ORPCError } from "@orpc/server";
import { captureException } from "@sentry/nextjs";
import type { CurrentUser } from "../users/currentUser";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { randomId } from "../utils/random";
import { createRevision } from "../revisions/revisionMutations";
import { conversations, Conversation, messages, notifications } from "../schema";
import { EditorData, isEditorTypeString } from "../ckeditor/editorHelpers";
import {
  userCanDo,
  userCanInitiateConversations,
  userHasMessagingDisabled,
  userIsAdmin,
  userIsAdminOrMod,
} from "../users/userHelpers";
import { unreadConversationMessageNotificationIds } from "./conversationQueries";
import { denormalizeRevision } from "../revisions/revisionHelpers";
import { convertImagesInObject } from "../cloudinary/convertImagesToCloudinary";
import {
  flagOrBlockUserOnManyDMs,
  notifyNewConversationParticipants,
  sendMessageNotifications,
  sendUserLeftConversationMessages,
  updateUserNotesOnModMessage,
} from "./messageCallbacks";
import { fetchConversationByParticipants } from "./messageQueries";

export const createConversation = async (
  user: CurrentUser,
  args: Pick<Conversation, "participantIds" | "title"> & { moderator?: boolean },
): Promise<Conversation> => {
  const conversation = await db.transaction(async (txn) => {
    const [conversation] = await txn
      .insert(conversations)
      .values([
        {
          _id: randomId(),
          latestActivity: new Date().toISOString(),
          ...args,
        },
      ])
      .returning();
    await flagOrBlockUserOnManyDMs({
      db: txn,
      currentConversation: conversation,
      currentUser: user,
    });
    return conversation;
  });
  return conversation;
};

export const findOrCreateConversation = async (
  user: CurrentUser,
  { userIds, moderator }: { userIds: string[]; moderator: boolean },
): Promise<string> => {
  if (userHasMessagingDisabled(user)) {
    throw new ORPCError("FORBIDDEN", {
      message: "You are not allowed to send messages",
    });
  }
  if (!userCanInitiateConversations(user)) {
    throw new ORPCError("FORBIDDEN", {
      message: "You must earn 10 karma to start a conversation",
    });
  }
  if (moderator && !userIsAdminOrMod(user)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Only moderators can start moderator conversations",
    });
  }
  const participantIds = uniq([...userIds, user._id]);
  const existingConversationId = await fetchConversationByParticipants(
    participantIds,
    moderator,
  );
  if (existingConversationId) {
    return existingConversationId;
  }
  const newConversation = await createConversation(user, {
    title: null,
    participantIds,
    moderator,
  });
  return newConversation._id;
};

export const createMessage = async ({
  user,
  editorData,
  conversation,
  noEmail,
}: {
  user: CurrentUser;
  editorData: EditorData;
  conversation: Conversation;
  noEmail?: boolean;
}) => {
  if (!isEditorTypeString(editorData.originalContents.type)) {
    throw new Error("Invalid editor type");
  }
  if (!editorData.originalContents.data.trim()) {
    throw new Error("Message is empty");
  }

  const receivers = await db.query.users.findMany({
    columns: {
      blockedUserIds: true,
    },
    where: {
      _id: { in: conversation.participantIds },
    },
  });
  for (const receiver of receivers) {
    if (receiver.blockedUserIds.includes(user._id)) {
      throw new ORPCError("FORBIDDEN", {
        message: "You are blocked from messaging users in this conversation",
      });
    }
  }

  const userIsParticipant = conversation.participantIds.includes(user._id);
  const messageId = randomId();

  const [message, updatedConversation] = await db.transaction(async (txn) => {
    const initialRevision = await createRevision(txn, user, editorData, {
      documentId: messageId,
      collectionName: "Messages",
      fieldName: "contents",
    });
    const { newRevision } = await convertImagesInObject(txn, initialRevision);
    const revision = newRevision ?? initialRevision;

    const [[message], [updatedConversation]] = await Promise.all([
      txn
        .insert(messages)
        .values([
          {
            _id: messageId,
            userId: user._id,
            conversationId: conversation._id,
            noEmail,
            contents: denormalizeRevision(revision),
            contentsLatest: revision._id,
          },
        ])
        .returning(),
      txn
        .update(conversations)
        .set({
          latestActivity: new Date().toISOString(),
          messageCount: sql`${conversations.messageCount} + 1`,
          archivedByIds: [],
          ...(!userIsParticipant && {
            participantIds: sql`fm_add_to_set(${conversations.participantIds}, ${user._id})`,
          }),
        })
        .where(eq(conversations._id, conversation._id))
        .returning(),
    ]);

    return [message, updatedConversation];
  });

  waitUntil(sendMessageNotifications(updatedConversation, message));
  waitUntil(updateUserNotesOnModMessage(updatedConversation));

  return message;
};

const fetchConversation = (conversationId: string) =>
  db.query.conversations.findFirst({
    where: { _id: conversationId },
  });

/**
 * Send a message as `user`, applying the permission checks for messages sent
 * from the inbox. Starting a conversation needs `userCanInitiateConversations`
 * whereas replying doesn't.
 */
export const sendConversationMessage = async ({
  user,
  conversationId,
  editorData,
  noEmail,
}: {
  user: CurrentUser;
  conversationId: string;
  editorData: EditorData;
  noEmail?: boolean;
}) => {
  if (userHasMessagingDisabled(user)) {
    throw new ORPCError("FORBIDDEN", {
      message: "You are not allowed to send messages",
    });
  }
  const conversation = await fetchConversation(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  if (conversation.messageCount < 1 && !userCanInitiateConversations(user)) {
    throw new ORPCError("FORBIDDEN", {
      message: "You must earn 10 karma to start a conversation",
    });
  }
  const canSend = conversation.participantIds.includes(user._id)
    ? userCanDo(user, "messages.new.own")
    : userCanDo(user, "messages.new.all");
  if (!canSend) {
    throw new Error("Permission denied");
  }
  return createMessage({
    user,
    editorData,
    conversation,
    noEmail: userIsAdmin(user) && !!noEmail,
  });
};

export const markConversationRead = async (
  user: CurrentUser,
  conversationId: string,
) => {
  await db
    .update(notifications)
    .set({ viewed: true })
    .where(
      inArray(
        notifications._id,
        unreadConversationMessageNotificationIds(user._id, conversationId),
      ),
    );
};

/**
 * Edit a conversation's title, participants or moderator flag. Only
 * participants and admins can edit, and only admins and mods can change the
 * moderator flag.
 */
export const updateConversation = async (
  user: CurrentUser,
  conversationId: string,
  {
    title,
    participantIds,
    moderator,
  }: {
    title?: string | null;
    participantIds?: string[];
    moderator?: boolean;
  },
): Promise<Conversation> => {
  const oldConversation = await fetchConversation(conversationId);
  if (!oldConversation) {
    throw new Error("Conversation not found");
  }
  const canEdit = oldConversation.participantIds.includes(user._id)
    ? userCanDo(user, "conversations.edit.own")
    : userCanDo(user, "conversations.edit.all");
  if (!canEdit) {
    throw new Error("Permission denied");
  }
  if (moderator !== undefined && !userIsAdminOrMod(user)) {
    throw new Error("Only moderators can change the moderator status");
  }

  const updatedConversation = await db.transaction(async (txn) => {
    const [updatedConversation] = await txn
      .update(conversations)
      .set({
        ...(title !== undefined && { title: title || null }),
        ...(participantIds && { participantIds: uniq(participantIds) }),
        ...(moderator !== undefined && { moderator }),
      })
      .where(eq(conversations._id, conversationId))
      .returning();
    await flagOrBlockUserOnManyDMs({
      db: txn,
      currentConversation: updatedConversation,
      oldConversation,
      currentUser: user,
    });
    return updatedConversation;
  });

  try {
    await sendUserLeftConversationMessages(updatedConversation, oldConversation);
    await notifyNewConversationParticipants(
      updatedConversation,
      oldConversation,
      user,
    );
  } catch (e) {
    console.error("Error notifying conversation participants:", e);
    captureException(e);
  }

  return updatedConversation;
};
