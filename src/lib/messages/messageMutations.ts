import type { CurrentUser } from "../users/currentUser";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { randomId } from "../utils/random";
import { createRevision } from "../revisions/revisionMutations";
import { conversations, Conversation, messages } from "../schema";
import { denormalizeRevision } from "../revisions/revisionHelpers";
import { convertImagesInObject } from "../cloudinary/convertImagesToCloudinary";
import {
  flagOrBlockUserOnManyDMs,
  sendMessageNotifications,
  updateUserNotesOnModMessage,
} from "./messageCallbacks";

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

export const createMessage = async ({
  user,
  html,
  conversation,
  noEmail,
}: {
  user: CurrentUser;
  html: string;
  conversation: Conversation;
  noEmail?: boolean;
}) => {
  if (!html) {
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
      throw new Error("You are blocked from messaging users in this conversation");
    }
  }

  const userIsParticipant = conversation.participantIds.includes(user._id);
  const messageId = randomId();

  const [message, updatedConversation] = await db.transaction(async (txn) => {
    const initialRevision = await createRevision(
      txn,
      user,
      {
        originalContents: { type: "ckEditorMarkup", data: html },
        updateType: "initial",
        commitMessage: "Initial commit",
      },
      {
        documentId: messageId,
        collectionName: "Messages",
        fieldName: "contents",
      },
    );
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
          archivedByIds: [],
          ...(!userIsParticipant
            ? { participantIds: [...conversation.participantIds, user._id] }
            : {}),
        })
        .where(eq(conversations._id, conversation._id))
        .returning(),
    ]);

    return [message, updatedConversation];
  });

  void sendMessageNotifications(updatedConversation, message);
  void updateUserNotesOnModMessage(updatedConversation);

  return message;
};
