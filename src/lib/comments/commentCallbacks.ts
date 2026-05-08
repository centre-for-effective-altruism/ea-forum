import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import difference from "lodash/difference";
import uniq from "lodash/uniq";
import type { CurrentUser } from "../users/currentUser";
import type { ForumEventCommentMetadata } from "../forumEvents/forumEventHelpers";
import { fetchCommentAncestors, PostForCommentCreation } from "./commentQueries";
import { rateLimitDateWhenUserNextAbleToComment } from "./commentRateLimits";
import { createNotifications } from "../notifications/notificationMutations";
import { fetchSubscribedUsers } from "../subscriptions/subscriptionQueries";
import { upsertForumEventSticker } from "../forumEvents/forumEventQueries";
import { subscriptionTypes } from "../subscriptions/subscriptionTypes";
import { db, DbOrTransaction, Transaction } from "../db";
import { captureEvent } from "../analytics/captureEvent";
import { postGetPageUrl } from "../posts/postsHelpers";
import { commentIsPublic } from "./commentHelpers";
import { akismetCheckComment } from "../akismet";
import { isAnyTest } from "../environment";
import {
  tags,
  Comment,
  posts,
  readStatuses,
  comments,
  users,
  Revision,
} from "@/lib/schema";

/** Threshold after which you are no longer affected by spam detection */
const SPAM_KARMA_THRESHOLD = 10;

export const updateCommentPost = async (txn: Transaction, comment: Comment) => {
  if (!comment.postId || comment.debateResponse) {
    return;
  }
  await txn
    .update(posts)
    .set({
      commentCount: sql<number>`${posts.commentCount} + 1`,
      lastCommentedAt: comment.postedAt,
      ...(comment.parentCommentId
        ? {
            lastCommentReplyAt: comment.postedAt,
          }
        : {
            topLevelCommentCount: sql<number>`${posts.topLevelCommentCount} + 1`,
          }),
    })
    .where(eq(posts._id, comment.postId));
};

export const updateCommentTag = async (txn: Transaction, comment: Comment) => {
  if (comment.tagId) {
    await txn
      .update(tags)
      .set(
        comment.tagCommentType === "SUBFORUM"
          ? { lastSubforumCommentAt: comment.postedAt }
          : { lastCommentedAt: comment.postedAt },
      )
      .where(eq(tags._id, comment.tagId));
  }
};

export const updateCommentAuthor = async (txn: Transaction, comment: Comment) => {
  await txn
    .update(users)
    .set({
      commentCount: sql<number>`${users.commentCount} + 1`,
      maxCommentCount: sql<number>`${users.maxCommentCount} + 1`,
    })
    .where(eq(users._id, comment.userId));
};

/**
 * Update the comment author's lastVisitedAt time for the post so that their
 * comment doesn't cause the post to look like it has unread comments
 */
export const updateReadStatusAfterComment = async (
  txn: Transaction,
  comment: Comment,
) => {
  if (comment.postId) {
    await txn
      .update(readStatuses)
      .set({
        lastUpdated: new Date().toISOString(),
      })
      .where(
        and(
          eq(readStatuses.postId, comment.postId),
          eq(readStatuses.userId, comment.userId),
          isNull(readStatuses.tagId),
        ),
      );
  }
};

export const updateDescendentCommentCounts = async (
  txn: Transaction,
  comment: Comment,
) => {
  if (!comment.parentCommentId) {
    return;
  }
  const ancestors = await fetchCommentAncestors(txn, comment._id);
  const ancestorIds = ancestors.map(({ _id }) => _id);
  await Promise.all([
    txn
      .update(comments)
      .set({
        lastSubthreadActivity: comment.createdAt,
        descendentCount: sql<number>`${comments.descendentCount} + 1`,
      })
      .where(inArray(comments._id, ancestorIds)),
    txn
      .update(comments)
      .set({
        directChildrenCount: sql<number>`${comments.directChildrenCount} + 1`,
      })
      .where(eq(comments._id, comment.parentCommentId)),
  ]);
};

export const checkCommentRateLimits = async (
  txn: Transaction,
  user: CurrentUser,
  comment: Comment,
) => {
  const rateLimit = await rateLimitDateWhenUserNextAbleToComment(txn, user, null);
  // If the user has created a comment that makes them hit the rate limit, record
  // an event (ignore the universal 8 sec rate limit)
  if (rateLimit && rateLimit.rateLimitType !== "universal") {
    // Note: This isn't sent when a comment is blocked due to the rate limit, only
    // if the *next* comment would be blocked. See "commentBlockedDueToRateLimit"
    // for tracking comments that are blocked
    captureEvent("commentRateLimitHit", {
      rateLimitType: rateLimit.rateLimitType ?? null,
      rateLimitName: rateLimit.rateLimitName,
      userId: user._id,
      commentId: comment._id,
    });
  }
};

export const updateCommentForumEvent = async (
  txn: Transaction,
  comment: Comment,
) => {
  const metadata = comment.forumEventMetadata as ForumEventCommentMetadata | null;
  if (metadata?.eventFormat !== "STICKERS") {
    return;
  }
  if (!comment.forumEventId) {
    throw new Error("Event comment must have forumEventId");
  }
  if (!metadata.sticker?._id) {
    throw new Error("Must include sticker");
  }

  const event = await txn.query.forumEvents.findFirst({
    columns: {
      maxStickersPerUser: true,
    },
    where: {
      _id: comment.forumEventId,
    },
  });
  if (!event) {
    throw new Error("Event not found");
  }

  const { _id, x, y, theta, emoji } = metadata.sticker;
  const stickerData = {
    _id,
    ...(x !== undefined && { x }),
    ...(y !== undefined && { y }),
    ...(theta !== undefined && { theta }),
    ...(emoji !== undefined && { emoji }),
    commentId: comment._id,
    userId: comment.userId,
  };

  await upsertForumEventSticker({
    txn,
    forumEventId: comment.forumEventId,
    stickerData,
    maxStickersPerUser: event.maxStickersPerUser,
  });
  captureEvent("upsertForumEventSticker", {
    forumEventId: comment.forumEventId,
    stickerData,
  });
};

export const checkCommentForSpam = async (
  txn: DbOrTransaction,
  user: CurrentUser,
  commentId: string,
  commentRevision: Revision,
  post: PostForCommentCreation,
) => {
  if (user.reviewedByUserId || user.karma >= SPAM_KARMA_THRESHOLD) {
    return;
  }

  const start = Date.now();
  const postUrl = postGetPageUrl({ post });
  const isSpam = await akismetCheckComment(txn, user, commentRevision, postUrl);
  const timeElapsed = Date.now() - start;
  captureEvent("checkForAkismetSpamCompleted", {
    commentId,
    timeElapsed,
  });
  if (!isSpam) {
    return;
  }
  if (!isAnyTest()) {
    console.warn("Deleting comment from user below spam threshold:", commentId);
  }
  await txn
    .update(comments)
    .set({
      deleted: true,
      deletedDate: new Date().toISOString(),
      deletedReason:
        "This comment has been marked as spam by the Akismet spam integration. We've sent the poster a PM with the content. If this deletion seems wrong to you, please send us a message on Intercom (the icon in the bottom-right of the page).",
    })
    .where(eq(comments._id, commentId));
};

export const newCommentNotifications = async (commentId: string) => {
  const comment = await db.query.comments.findFirst({
    columns: {
      _id: true,
      userId: true,
      draft: true,
      deleted: true,
      rejected: true,
      authorIsUnreviewed: true,
      parentCommentId: true,
    },
    with: {
      post: {
        columns: {
          isEvent: true,
        },
      },
    },
    where: {
      _id: commentId,
    },
  });
  if (!comment || !commentIsPublic(comment)) {
    return;
  }

  // Notify event RSVPs
  if (comment.post?.isEvent) {
    // TODO: await utils.notifyRsvps(comment, post, context);
  }

  // Keep track of whom we've notified (so that we don't notify the same user
  // twice for one comment, if e.g. they're both the author of the post and the
  // author of a comment being replied to)
  let notifiedUsers: string[] = [];

  // 1. Notify users who are subscribed to the parent comment
  if (comment.parentCommentId) {
    const allParentComments = await fetchCommentAncestors(db, commentId);
    const parentComments = allParentComments.filter(({ depth }) => depth < 5);

    let newReplyUserIds: string[] = [];
    let newReplyToYouDirectUserIds: string[] = [];
    let newReplyToYouIndirectUserIds: string[] = [];

    for (const parentComment of parentComments) {
      const { _id: currentParentCommentId, userId: currentParentCommentAuthorId } =
        parentComment;

      const subscribedUsers = await fetchSubscribedUsers({
        documentId: currentParentCommentId,
        collectionName: "Comments",
        type: subscriptionTypes.newReplies,
        potentiallyDefaultSubscribedUserIds: [currentParentCommentAuthorId],
        userIsDefaultSubscribed: (u) => u.auto_subscribe_to_my_comments,
      });
      const subscribedUserIds = subscribedUsers.map(({ _id }) => _id);

      // Don't notify the author of their own comment, and filter out the author
      // of the parent-comment to be treated specially (with a newReplyToYou
      // notification instead of a newReply notification).
      newReplyUserIds.push(
        ...difference(subscribedUserIds, [
          comment.userId,
          currentParentCommentAuthorId,
        ]),
      );

      // Separately notify authors of replies to their own comments
      if (
        subscribedUserIds.includes(currentParentCommentAuthorId) &&
        currentParentCommentAuthorId !== comment.userId
      ) {
        if (currentParentCommentId === comment.parentCommentId) {
          newReplyToYouDirectUserIds.push(currentParentCommentAuthorId);
        } else {
          newReplyToYouIndirectUserIds.push(currentParentCommentAuthorId);
        }
      }
    }

    // Take the difference to prevent double-notifying
    newReplyUserIds = uniq(
      difference(newReplyUserIds, [
        ...newReplyToYouDirectUserIds,
        ...newReplyToYouIndirectUserIds,
      ]),
    );
    // Direct replies take precedence over indirect replies
    newReplyToYouIndirectUserIds = uniq(
      difference(newReplyToYouIndirectUserIds, newReplyToYouDirectUserIds),
    );
    newReplyToYouDirectUserIds = uniq(newReplyToYouDirectUserIds);

    await Promise.all([
      createNotifications({
        userIds: newReplyUserIds,
        notificationType: "newReply",
        documentType: "comment",
        documentId: comment._id,
      }),
      createNotifications({
        userIds: newReplyToYouDirectUserIds,
        notificationType: "newReplyToYou",
        documentType: "comment",
        documentId: comment._id,
        extraData: { direct: true },
      }),
      createNotifications({
        userIds: newReplyToYouIndirectUserIds,
        notificationType: "newReplyToYou",
        documentType: "comment",
        documentId: comment._id,
        extraData: { direct: false },
      }),
    ]);

    notifiedUsers = [
      ...notifiedUsers,
      ...newReplyUserIds,
      ...newReplyToYouDirectUserIds,
      ...newReplyToYouIndirectUserIds,
    ];
  }

  // TODO
  void notifiedUsers;

  /*
  // 2. If this comment is a debate comment, notify users who are subscribed to the post as a debate (`newDebateComments`)
  if (post && comment.debateResponse) {
    // Get all the debate participants, but exclude the comment author if they're a debate participant
    const debateParticipantIds = _.difference(
      [post.userId, ...post.coauthorUserIds],
      [comment.userId],
    );

    const debateSubscribers = await getSubscribedUsers({
      documentId: comment.postId,
      collectionName: "Posts",
      type: subscriptionTypes.newDebateComments,
      potentiallyDefaultSubscribedUserIds: debateParticipantIds
    });

    const debateSubscriberIds = debateSubscribers.map(sub => sub._id);
    // Handle debate readers
    // Filter out debate participants, since they get a different notification type
    // (We shouldn't have notified any users for these comments previously, but leaving that in for sanity)
    const debateSubscriberIdsToNotify = _.difference(debateSubscriberIds, [...debateParticipantIds, ...notifiedUsers, comment.userId]);
    await createNotifications({ userIds: debateSubscriberIdsToNotify, notificationType: 'newDebateComment', documentType: 'comment', documentId: comment._id });

    // Handle debate participants
    const subscribedParticipantIds = _.intersection(debateSubscriberIds, debateParticipantIds);
    await createNotifications({ userIds: subscribedParticipantIds, notificationType: 'newDebateReply', documentType: 'comment', documentId: comment._id });

    // Avoid notifying users who are subscribed to both the debate comments and regular comments on a debate twice
    notifiedUsers = [...notifiedUsers, ...debateSubscriberIdsToNotify, ...subscribedParticipantIds];
  }

  // 3. Notify users who are subscribed to the post (which may or may not include the post's author)
  let userIdsSubscribedToPost: Array<string> = [];
  const usersSubscribedToPost = await getSubscribedUsers({
    documentId: comment.postId,
    collectionName: "Posts",
    type: subscriptionTypes.newComments,
    potentiallyDefaultSubscribedUserIds: post ? [post.userId, ...post.coauthorUserIds] : [],
    userIsDefaultSubscribed: u => u.auto_subscribe_to_my_posts
  })
  userIdsSubscribedToPost = _.map(usersSubscribedToPost, u=>u._id);

  // if the post is associated with a group, also (potentially) notify the group organizers
  if (post && post.groupId) {
    const group = await loaders.Localgroups.load(post.groupId)
    if (group?.organizerIds && group.organizerIds.length) {
      const subsWithOrganizers = await getSubscribedUsers({
        documentId: comment.postId,
        collectionName: "Posts",
        type: subscriptionTypes.newComments,
        potentiallyDefaultSubscribedUserIds: group.organizerIds,
        userIsDefaultSubscribed: u => u.autoSubscribeAsOrganizer
      })
      userIdsSubscribedToPost = _.union(userIdsSubscribedToPost, _.map(subsWithOrganizers, u=>u._id))
    }
  }

  // Notify users who are subscribed to shortform posts
  if (!comment.topLevelCommentId && comment.shortform) {
    const usersSubscribedToShortform = await getSubscribedUsers({
      documentId: comment.postId,
      collectionName: "Posts",
      type: subscriptionTypes.newShortform
    })
    const userIdsSubscribedToShortform = _.map(usersSubscribedToShortform, u=>u._id);
    await createNotifications({userIds: userIdsSubscribedToShortform, notificationType: 'newShortform', documentType: 'comment', documentId: comment._id});
    notifiedUsers = [ ...userIdsSubscribedToShortform, ...notifiedUsers]
  }

  // remove userIds of users that have already been notified
  // and of comment author (they could be replying in a thread they're subscribed to)
  const postSubscriberIdsToNotify = _.difference(userIdsSubscribedToPost, [...notifiedUsers, comment.userId])
  if (postSubscriberIdsToNotify.length > 0) {
    await createNotifications({userIds: postSubscriberIdsToNotify, notificationType: 'newComment', documentType: 'comment', documentId: comment._id})
    notifiedUsers = [ ...notifiedUsers, ...postSubscriberIdsToNotify]
  }

  // 4. If this comment is in a subforum, notify members with email notifications enabled
  if (
    comment.tagId &&
    comment.tagCommentType === "SUBFORUM" &&
    !comment.topLevelCommentId &&
    !comment.authorIsUnreviewed // FIXME: make this more general, and possibly queue up notifications from unreviewed users to send once they are approved
  ) {
    const subforumSubcribedUsers = await Users.find({profileTagIds: comment.tagId}).fetch();
    const subforumSubscriberIds = subforumSubcribedUsers.map((u) => u._id);
    const subforumSubscriberIdsMaybeNotify = (
      await UserTagRels.find({
        userId: { $in: subforumSubscriberIds },
        tagId: comment.tagId,
        subforumEmailNotifications: true,
      }).fetch()
    ).map((u) => u.userId);
    const subforumSubscriberIdsToNotify = _.difference(subforumSubscriberIdsMaybeNotify, [...notifiedUsers, comment.userId])

    await createNotifications({
      userIds: subforumSubscriberIdsToNotify,
      notificationType: "newSubforumComment",
      documentType: "comment",
      documentId: comment._id,
    });
  }

  // 5. Notify users who are subscribed to comments by the comment author
  const commentAuthorSubscribers = await getSubscribedUsers({
    documentId: comment.userId,
    collectionName: "Users",
    type: subscriptionTypes.newUserComments
  })
  const commentAuthorSubscriberIds = commentAuthorSubscribers.map(({ _id }) => _id)
  const commentAuthorSubscriberIdsToNotify = _.difference(commentAuthorSubscriberIds, notifiedUsers)
  await createNotifications({
    userIds: commentAuthorSubscriberIdsToNotify,
    notificationType: 'newUserComment',
    documentType: 'comment',
    documentId: comment._id
  });
  */
};
