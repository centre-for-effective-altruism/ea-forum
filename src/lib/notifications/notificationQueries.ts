import type { NotificationDocument } from "./notificationHelpers";
import { InsertNotification, notifications } from "../schema";
import { randomId } from "../utils/random";
import { db } from "../db";

export const insertNotification = async (data: Omit<InsertNotification, "_id">) => {
  const [result] = await db
    .insert(notifications)
    .values([
      {
        _id: randomId(),
        ...data,
      },
    ])
    .returning();
  return result;
};

type NotificationDocumentSummary = {
  type: NotificationDocument;
  associatedUserName: string | null;
  displayName: string | null;
};

export const getNotificationDocumentSummary = async (
  documentType: NotificationDocument | null,
  documentId: string | null,
): Promise<NotificationDocumentSummary | null> => {
  if (!documentId) {
    throw new Error(`Missing id for document summary of type ${documentType}`);
  }
  switch (documentType) {
    case "post":
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
        },
        with: {
          user: {
            columns: {
              displayName: true,
            },
          },
        },
        where: {
          _id: documentId,
        },
      });
      return post
        ? {
            type: documentType,
            displayName: post.title,
            associatedUserName: post.user?.displayName ?? null,
          }
        : null;
    case "comment":
      const comment = await db.query.comments.findFirst({
        columns: {
          _id: true,
        },
        with: {
          post: {
            columns: {
              title: true,
            },
          },
          tag: {
            columns: {
              name: true,
            },
          },
          user: {
            columns: {
              displayName: true,
            },
          },
        },
        where: {
          _id: documentId,
        },
      });
      return comment
        ? {
            type: documentType,
            displayName:
              comment.post?.title ?? comment.tag?.name ?? "unknown document",
            associatedUserName: comment.user?.displayName ?? null,
          }
        : null;
    case "user":
      const user = await db.query.users.findFirst({
        columns: {
          displayName: true,
        },
        where: {
          _id: documentId,
        },
      });
      return user
        ? {
            type: documentType,
            displayName: user.displayName,
            associatedUserName: user.displayName,
          }
        : null;
    case "message":
      const message = await db.query.messages.findFirst({
        columns: {
          _id: true,
        },
        with: {
          conversation: {
            columns: {
              title: true,
            },
          },
          user: {
            columns: {
              displayName: true,
            },
          },
        },
        where: {
          _id: documentId,
        },
      });
      return message
        ? {
            type: documentType,
            displayName: message.conversation?.title ?? null,
            associatedUserName: message.user?.displayName ?? null,
          }
        : null;
    case "localgroup":
      const group = await db.query.localgroups.findFirst({
        columns: {
          name: true,
        },
        where: {
          _id: documentId,
        },
      });
      return group
        ? {
            type: documentType,
            displayName: group.name ?? "[missing local group name]",
            associatedUserName: null,
          }
        : null;
    case "tagRel":
      const tagRel = await db.query.tagRels.findFirst({
        columns: {
          _id: true,
        },
        where: {
          _id: documentId,
        },
      });
      return tagRel
        ? {
            type: documentType,
            displayName: null,
            associatedUserName: null,
          }
        : null;
    case "sequence":
      const sequence = await db.query.sequences.findFirst({
        columns: {
          _id: true,
        },
        where: {
          _id: documentId,
        },
      });
      return sequence
        ? {
            type: documentType,
            displayName: null,
            associatedUserName: null,
          }
        : null;
    default:
      throw new Error(`Invalid document type type for summary: ${documentType}`);
  }
};
