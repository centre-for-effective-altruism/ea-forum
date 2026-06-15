import type { User } from "../schema";
import type { JsonRecord } from "../typeHelpers";
import type {
  NotificationChannel,
  NotificationDocument,
} from "./notificationHelpers";
import { getPostCollaborateUrl, postGetEditUrl } from "../posts/postsHelpers";
import { sequenceGetPageUrl } from "../sequences/sequenceHelpers";
import { getNotificationDocumentSummary } from "./notificationQueries";
import { rsvpToText } from "../posts/rsvpHelpers";
import { tagGetUrl } from "../tags/tagHelpers";
import { db } from "../db";
import keyBy from "lodash/keyBy";
import sortBy from "lodash/sortBy";
import startCase from "lodash/startCase";

type GetMessageProps = {
  documentType: NotificationDocument | null;
  documentId: string | null;
  extraData?: JsonRecord;
};

type GetLinkProps = {
  documentType: string | null;
  documentId: string | null;
  extraData?: JsonRecord;
};

type NotificationType = {
  name: string;
  userSettingField: (keyof User & `notification${string}`) | null;
  allowedChannels?: NotificationChannel[];
  getMessage: (props: GetMessageProps) => Promise<string>;
  getLink?: (props: GetLinkProps) => string;
};

const createNotificationType = ({
  allowedChannels = ["onsite", "email"],
  ...otherArgs
}: NotificationType) => ({ allowedChannels, ...otherArgs });

export const notificationTypesArray: NotificationType[] = [
  createNotificationType({
    name: "newPost",
    userSettingField: "notificationSubscribedUserPost",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing new post _id for notification");
      }
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
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return `${post.user?.displayName} has created a new post: ${post.title}`;
    },
  }),
  createNotificationType({
    name: "newUserComment",
    userSettingField: "notificationSubscribedUserComment",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing new comment _id for notification");
      }
      const comment = await db.query.comments.findFirst({
        columns: {
          _id: true,
        },
        with: {
          user: {
            columns: {
              displayName: true,
            },
          },
          post: {
            columns: {
              title: true,
            },
          },
        },
        where: {
          _id: documentId,
        },
      });
      if (!comment) {
        throw new Error("Missing comment for notification");
      }
      return `${comment.user?.displayName} left a new comment on the post ${comment.post?.title})`;
    },
  }),
  createNotificationType({
    name: "postApproved",
    userSettingField: null,
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing approved post _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
        },
        where: {
          _id: documentId,
        },
      });
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return `Your post "${post.title}" has been approved`;
    },
  }),
  createNotificationType({
    name: "postNominated",
    userSettingField: "notificationPostsNominatedReview",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing nominated post _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
        },
        where: {
          _id: documentId,
        },
      });
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return `Your post is nominated for the Decade Review: "${post.title}"`;
    },
  }),
  createNotificationType({
    name: "newEvent",
    userSettingField: "notificationPostsInGroups",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing new event _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
        },
        with: {
          group: {
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
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return post.group
        ? `${post.group.name} posted a new event`
        : `${post.user?.displayName} has created a new event`;
    },
  }),
  createNotificationType({
    name: "newGroupPost",
    userSettingField: "notificationPostsInGroups",
    async getMessage({ documentId }) {
      if (!documentId) {
        throw new Error("Missing new group post _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
        },
        with: {
          group: {
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
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return post.group
        ? `${post.user?.displayName} has created a new post in the group "${post.group.name}"`
        : `${post.user?.displayName} has created a new post in a group`;
    },
  }),
  // New comment on a post you're subscribed to
  createNotificationType({
    name: "newComment",
    userSettingField: "notificationCommentsOnSubscribedPost",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing new comment _id for notification");
      }
      const comment = await db.query.comments.findFirst({
        columns: {
          _id: true,
        },
        with: {
          user: {
            columns: {
              displayName: true,
            },
          },
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
        },
        where: {
          _id: documentId,
        },
      });
      if (!comment) {
        throw new Error("Missing comment for notification");
      }
      const title = comment.post?.title ?? comment.tag?.name ?? "unknown document";
      return `${comment.user?.displayName} left a new comment on "${title}"`;
    },
  }),
  // New comment on a subforum you're subscribed to
  createNotificationType({
    name: "newSubforumComment",
    userSettingField: "notificationSubforumUnread",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing new subforum comment _id for notification");
      }
      const comment = await db.query.comments.findFirst({
        columns: {
          _id: true,
        },
        with: {
          user: {
            columns: {
              displayName: true,
            },
          },
          tag: {
            columns: {
              name: true,
            },
          },
        },
        where: {
          _id: documentId,
        },
      });
      if (!comment) {
        throw new Error("Missing comment for notification");
      }
      const title = comment.tag?.name ?? "unknown topic";
      return `${startCase(title)}: ${comment.user?.displayName} left a new comment`;
    },
  }),
  // New message in a dialogue which you are a participant
  // (Notifications for regular comments are handled through the `newComment`
  // notification)
  createNotificationType({
    name: "newDialogueMessages",
    userSettingField: "notificationDialogueMessages",
    getMessage: async ({ documentId, extraData }) => {
      const newMessageAuthorId = extraData?.newMessageAuthorId;
      if (!documentId || typeof newMessageAuthorId !== "string") {
        throw new Error("Missing _ids for new dialogue notification");
      }
      const [post, commenter] = await Promise.all([
        db.query.posts.findFirst({
          columns: {
            title: true,
          },
          where: {
            _id: documentId,
          },
        }),
        db.query.users.findFirst({
          columns: {
            displayName: true,
          },
          where: {
            _id: newMessageAuthorId,
          },
        }),
      ]);
      if (!post || !commenter) {
        throw new Error("Missing data for dialogue notification");
      }
      return `${commenter.displayName} left a new reply in your dialogue "${post.title}"`;
    },
    getLink: ({ documentId }: GetLinkProps) => `/editPost?postId=${documentId}`,
  }),
  // Used when a user already has unread dialogue message notification. Primitive
  // batching to prevent spamming the user. Send instead of
  // NewDialogueMessageNotifications when there is already one already unread.
  // Not sent if another instance of itself is unread.
  createNotificationType({
    name: "newDialogueBatchMessages",
    // Using same setting as regular NewDialogueMessageNotification
    userSettingField: "notificationDialogueMessages",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing new dialogue _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
        },
        where: {
          _id: documentId,
        },
      });
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return `Multiple new messages in your dialogue "${post.title}"`;
    },
    getLink: ({ documentId }) => `/editPost?postId=${documentId}`,
  }),
  createNotificationType({
    name: "newShortform",
    userSettingField: "notificationShortformContent",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing new quick take _id for notification");
      }
      const comment = await db.query.comments.findFirst({
        columns: {
          _id: true,
        },
        with: {
          user: {
            columns: {
              displayName: true,
            },
          },
          post: {
            columns: {
              title: true,
            },
          },
        },
        where: {
          _id: documentId,
        },
      });
      if (!comment) {
        throw new Error("Missing comment for notification");
      }
      return `New comment on "${comment.post?.title ?? "unknown quick take"}"`;
    },
  }),
  createNotificationType({
    name: "newTagPosts",
    userSettingField: "notificationSubscribedTagPost",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing tag rel _id for notification");
      }
      const tagRel = await db.query.tagRels.findFirst({
        columns: {
          _id: true,
        },
        with: {
          tag: {
            columns: {
              name: true,
            },
          },
          post: {
            columns: {
              title: true,
            },
          },
        },
        where: {
          _id: documentId,
        },
      });
      if (!tagRel || !tagRel.tag || !tagRel.post) {
        throw new Error("Missing document for notification");
      }
      return `New post tagged '${tagRel.tag.name}: ${tagRel.post.title}'`;
    },
  }),
  createNotificationType({
    name: "newSequencePosts",
    userSettingField: "notificationSubscribedSequencePost",
    async getMessage({ documentId }: GetMessageProps) {
      if (!documentId) {
        throw new Error("Missing sequence _id for notification");
      }
      const sequence = await db.query.sequences.findFirst({
        columns: {
          title: true,
        },
        where: {
          _id: documentId,
        },
      });
      if (!sequence) {
        throw new Error("Missing sequence for notification");
      }
      return `Posts added to ${sequence.title}`;
    },
    getLink: ({ documentId }) =>
      documentId ? sequenceGetPageUrl({ sequence: { _id: documentId } }) : "#",
  }),
  // Reply to a comment you're subscribed to
  createNotificationType({
    name: "newReply",
    userSettingField: "notificationRepliesToSubscribedComments",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing new reply _id for notification");
      }
      const comment = await db.query.comments.findFirst({
        columns: {
          _id: true,
        },
        with: {
          user: {
            columns: {
              displayName: true,
            },
          },
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
        },
        where: {
          _id: documentId,
        },
      });
      if (!comment) {
        throw new Error("Missing comment for notification");
      }
      const title = comment.post?.title ?? comment.tag?.name ?? "unknown document";
      return `${comment.user?.displayName} replied to a comment on "${title}"`;
    },
  }),
  // Reply to a comment you are the author of
  createNotificationType({
    name: "newReplyToYou",
    userSettingField: "notificationRepliesToMyComments",
    getMessage: async ({ documentId, extraData }) => {
      if (!documentId) {
        throw new Error("Missing new reply _id for notification");
      }
      const comment = await db.query.comments.findFirst({
        columns: {
          _id: true,
        },
        with: {
          user: {
            columns: {
              displayName: true,
            },
          },
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
        },
        where: {
          _id: documentId,
        },
      });
      if (!comment) {
        throw new Error("Missing comment for notification");
      }
      const title = comment.post?.title ?? comment.tag?.name ?? "unknown document";
      return extraData?.direct === false
        ? `${comment.user?.displayName} replied to a thread you're in on "${title}"`
        : `${comment.user?.displayName} replied to your comment on "${title}"`;
    },
  }),
  createNotificationType({
    name: "newMessage",
    userSettingField: "notificationPrivateMessage",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing message _id for notification");
      }
      const message = await db.query.messages.findFirst({
        columns: {
          _id: true,
        },
        with: {
          user: {
            columns: {
              displayName: true,
            },
          },
          conversation: {
            columns: {
              title: true,
            },
          },
        },
        where: {
          _id: documentId,
        },
      });
      if (!message?.user) {
        throw new Error("Missing message or user for notification");
      }
      const title = message.conversation?.title
        ? ` in the conversation ${message.conversation.title}`
        : "";
      return `${message.user?.displayName} sent you a message${title}`;
    },
  }),
  createNotificationType({
    name: "wrapped",
    userSettingField: null,
    getMessage: async ({ extraData }) =>
      `Check out your ${extraData?.year ?? 2023} EA Forum Wrapped`,
    getLink: () => "/wrapped",
  }),
  createNotificationType({
    name: "emailVerificationRequired",
    userSettingField: null,
    getMessage: async () =>
      "Verify your email address to activate email subscriptions.",
  }),
  createNotificationType({
    name: "postSharedWithUser",
    userSettingField: "notificationSharedWithMe",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing shared post _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
          draft: true,
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
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return `${post.user?.displayName} shared their ${post.draft ? "draft" : "post"} "${post.title}" with you`;
    },
    getLink: ({ documentId }): string => {
      if (!documentId) {
        throw new Error("PostSharedWithUserNotification documentId is missing");
      }
      return getPostCollaborateUrl(documentId, false);
    },
  }),
  createNotificationType({
    name: "addedAsCoauthor",
    userSettingField: "notificationAddedAsCoauthor",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing coauthored post _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
          collabEditorDialogue: true,
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
      if (!post) {
        throw new Error("Missing post for notification");
      }
      const postOrDialogue = post.collabEditorDialogue ? "dialogue" : "post";
      return `${post.user?.displayName} added you as a coauthor to the ${postOrDialogue} "${post.title}"`;
    },
    getLink: ({ documentId }): string => {
      if (!documentId) {
        throw new Error("PostAddedAsCoauthorNotification documentId is missing");
      }
      return postGetEditUrl(documentId, false);
    },
  }),
  createNotificationType({
    name: "newEventInRadius",
    userSettingField: "notificationEventInRadius",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing event _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
        },
        where: {
          _id: documentId,
        },
      });
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return `New event in your area: ${post.title}`;
    },
  }),
  createNotificationType({
    name: "editedEventInRadius",
    userSettingField: "notificationEventInRadius",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing event _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
        },
        where: {
          _id: documentId,
        },
      });
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return `Event in your area updated: ${post.title}`;
    },
  }),
  createNotificationType({
    name: "newRSVP",
    userSettingField: "notificationRSVPs",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing event _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
          rsvps: true,
        },
        where: {
          _id: documentId,
        },
      });
      if (!post) {
        throw new Error("Missing post for notification");
      }
      const rsvps = post.rsvps ?? [];
      const lastRsvp = sortBy(rsvps, "createdAt")[rsvps.length - 1];
      if (!lastRsvp) {
        throw new Error("RSVP not found for notification");
      }
      return `${lastRsvp.name} responded "${rsvpToText(lastRsvp)}" to your event ${post.title}`;
    },
  }),
  createNotificationType({
    name: "cancelledRSVP",
    userSettingField: "notificationRSVPs",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing event _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
        },
        where: {
          _id: documentId,
        },
      });
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return `Someone cancelled their RSVP to your event ${post.title}`;
    },
  }),
  createNotificationType({
    name: "karmaPowersGained",
    userSettingField: "notificationKarmaPowersGained",
    getMessage: async () => "Your votes are stronger because your karma went up!",
    getLink: () => tagGetUrl({ tag: { slug: "vote-strength" } }),
  }),
  createNotificationType({
    name: "newGroupOrganizer",
    userSettingField: "notificationGroupAdministration",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing group _id for notification");
      }
      const group = await db.query.localgroups.findFirst({
        columns: {
          name: true,
        },
        where: {
          _id: documentId,
        },
      });
      if (!group) {
        throw new Error("Missing group for notification");
      }
      return `You've been added as an organizer of ${group.name}`;
    },
  }),
  createNotificationType({
    name: "newSubforumMember",
    userSettingField: "notificationGroupAdministration",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing user _id for notification");
      }
      const user = await db.query.users.findFirst({
        columns: {
          displayName: true,
        },
        where: {
          _id: documentId,
        },
      });
      if (!user) {
        throw new Error("Missing user for notification");
      }
      return `A new user has joined your topic: ${user.displayName}`;
    },
  }),
  createNotificationType({
    name: "newCommentOnDraft",
    userSettingField: "notificationCommentsOnDraft",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing post _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
        },
        where: {
          _id: documentId,
        },
      });
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return `New comments on your draft ${post.title}`;
    },
    getLink: ({ documentId, extraData }): string => {
      if (!documentId) {
        throw new Error("NewCommentOnDraftNotification documentId is missing");
      }
      return postGetEditUrl(documentId, false, extraData?.linkSharingKey as string);
    },
  }),
  createNotificationType({
    name: "coauthorRequestNotification",
    userSettingField: "notificationSharedWithMe",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing post _id for notification");
      }
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
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return `${post.user?.displayName} requested that you co-author their post "${post.title}"`;
    },
  }),
  createNotificationType({
    name: "coauthorAcceptNotification",
    userSettingField: "notificationSharedWithMe",
    getMessage: async ({ documentId }) => {
      if (!documentId) {
        throw new Error("Missing post _id for notification");
      }
      const post = await db.query.posts.findFirst({
        columns: {
          title: true,
        },
        where: {
          _id: documentId,
        },
      });
      if (!post) {
        throw new Error("Missing post for notification");
      }
      return `Your co-author request for "${post.title}" was accepted`;
    },
  }),
  createNotificationType({
    name: "keywordAlert",
    userSettingField: "notificationKeywordAlert",
    getMessage: async ({ extraData }) => {
      const alerts = extraData?.count === 1 ? "alert" : "alerts";
      return `${extraData?.count} new ${alerts} for "${extraData?.keyword}"`;
    },
    getLink: ({ extraData }) => {
      if (!extraData?.keyword || !extraData.startDate || !extraData.endDate) {
        throw new Error("Invalid keyword alert data");
      }
      const { keyword, startDate, endDate } = extraData;
      const start = new Date(startDate as string).toISOString();
      const end = new Date(endDate as string).toISOString();
      const encodedKeyword = encodeURIComponent(keyword as string);
      return `/keywords/${encodedKeyword}?start=${start}&end=${end}`;
    },
  }),
  createNotificationType({
    name: "newMention",
    userSettingField: "notificationNewMention",
    getMessage: async ({ documentType, documentId }) => {
      const summary = await getNotificationDocumentSummary(documentType, documentId);
      return `${summary?.associatedUserName} mentioned you in ${summary?.displayName}`;
    },
  }),
  createNotificationType({
    name: "newPingback",
    userSettingField: "notificationNewPingback",
    getMessage: async ({ documentType, documentId, extraData }) => {
      const summary = await getNotificationDocumentSummary(documentType, documentId);
      return `${summary?.associatedUserName} mentioned your ${extraData?.pingbackType} "${extraData?.pingbackDocumentExcerpt}"`;
    },
  }),
  createNotificationType({
    name: "pollClosingSoon",
    userSettingField: "notificationPollClosingSoon",
    getMessage: async ({ extraData }) => {
      const isCreator = extraData?.isCreator;
      const pollQuestion = extraData?.pollQuestion || "a poll";
      return isCreator
        ? `Your poll closes soon: "${pollQuestion}"`
        : `A poll you voted on closes soon: "${pollQuestion}"`;
    },
    getLink: ({ extraData }) => (extraData?.link as string) || "#",
  }),
  createNotificationType({
    name: "pollClosed",
    userSettingField: "notificationPollClosed",
    getMessage: async ({ extraData }) => {
      const isCreator = extraData?.isCreator;
      const pollQuestion = extraData?.pollQuestion || "a poll";
      return isCreator
        ? `Your poll has closed: "${pollQuestion}"`
        : `A poll you voted on has closed: "${pollQuestion}"`;
    },
    getLink: ({ extraData }) => (extraData?.link as string) || "#",
  }),
];

const notificationTypes: Record<string, NotificationType> = keyBy(
  notificationTypesArray,
  "name",
);

export const getNotificationTypeByName = (name: string) => {
  if (name in notificationTypes) {
    return notificationTypes[name];
  }
  throw new Error(`Invalid notification type: ${name}`);
};

export const getNotificationTypes = () => Object.keys(notificationTypes);
