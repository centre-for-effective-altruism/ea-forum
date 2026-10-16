import type { NotificationDocument } from "./notificationHelpers";
import { InsertNotification, notifications } from "../schema";
import { localgroupGetPageUrl } from "../localgroups/localgroupHelpers";
import { sequenceGetPageUrl } from "../sequences/sequenceHelpers";
import { commentGetPageUrl } from "../comments/commentHelpers";
import { messageGetPageUrl } from "../messages/messageHelpers";
import { userGetProfileUrl } from "../users/userHelpers";
import { postGetPageUrl } from "../posts/postsHelpers";
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
  link: string;
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
          _id: true,
          slug: true,
          title: true,
          isEvent: true,
          groupId: true,
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
            link: post ? postGetPageUrl({ post }) : "#",
          }
        : null;
    case "comment":
      const comment = await db.query.comments.findFirst({
        columns: {
          _id: true,
          tagCommentType: true,
        },
        with: {
          post: {
            columns: {
              _id: true,
              slug: true,
              title: true,
            },
          },
          tag: {
            columns: {
              slug: true,
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
            link: comment ? commentGetPageUrl({ comment }) : "#",
          }
        : null;
    case "user":
      const user = await db.query.users.findFirst({
        columns: {
          slug: true,
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
            link: user ? userGetProfileUrl({ user }) : "#",
          }
        : null;
    case "message":
      const message = await db.query.messages.findFirst({
        columns: {
          _id: true,
          conversationId: true,
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
            link: message ? messageGetPageUrl({ message }) : "#",
          }
        : null;
    case "localgroup":
      const localgroup = await db.query.localgroups.findFirst({
        columns: {
          _id: true,
          name: true,
        },
        where: {
          _id: documentId,
        },
      });
      return localgroup
        ? {
            type: documentType,
            displayName: localgroup.name ?? "[missing local group name]",
            associatedUserName: null,
            link: localgroup ? localgroupGetPageUrl({ localgroup }) : "#",
          }
        : null;
    case "tagRel":
      const tagRel = await db.query.tagRels.findFirst({
        columns: {
          _id: true,
        },
        with: {
          post: {
            columns: {
              _id: true,
              slug: true,
              isEvent: true,
              groupId: true,
            },
          },
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
            link: tagRel?.post ? postGetPageUrl({ post: tagRel.post }) : "#",
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
            link: sequence ? sequenceGetPageUrl({ sequence }) : "#",
          }
        : null;
    default:
      throw new Error(`Invalid document type type for summary: ${documentType}`);
  }
};
