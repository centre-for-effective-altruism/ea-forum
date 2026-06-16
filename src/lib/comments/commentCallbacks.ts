import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import intersection from "lodash/intersection";
import difference from "lodash/difference";
import union from "lodash/union";
import uniq from "lodash/uniq";
import type { CurrentUser } from "../users/currentUser";
import type { ForumEventCommentMetadata } from "../forumEvents/forumEventHelpers";
import { fetchCommentAncestors, PostForCommentCreation } from "./commentQueries";
import { rateLimitDateWhenUserNextAbleToComment } from "./commentRateLimits";
import { createNotifications } from "../notifications/notificationMutations";
import { fetchSubscribedUsers } from "../subscriptions/subscriptionQueries";
import { upsertForumEventSticker } from "../forumEvents/forumEventQueries";
import { subscriptionTypes } from "../subscriptions/subscriptionTypes";
import { runPangramOnRevision } from "../revisions/pangramMutations";
import { captureServerEvent } from "../analytics/captureServerEvent";
import { db, DbOrTransaction, Transaction } from "../db";
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
    captureServerEvent("commentRateLimitHit", {
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
  captureServerEvent("upsertForumEventSticker", {
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
  captureServerEvent("checkForAkismetSpamCompleted", {
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
      topLevelCommentId: true,
      shortform: true,
      userId: true,
      draft: true,
      deleted: true,
      rejected: true,
      authorIsUnreviewed: true,
      parentCommentId: true,
      debateResponse: true,
      tagId: true,
      tagCommentType: true,
    },
    with: {
      post: {
        columns: {
          _id: true,
          slug: true,
          userId: true,
          coauthorUserIds: true,
          groupId: true,
          isEvent: true,
          rsvps: true,
        },
        with: {
          group: {
            columns: {
              organizerIds: true,
            },
          },
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
  if (comment.post?.isEvent && comment.post.rsvps?.length) {
    // TODO: Send emails to RSVPS - this is currently handled by ForumMagnum
    // since event pages haven't been migrated yet
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

  // 2. If this comment is a debate comment, notify users who are subscribed to
  // the post as a debate (`newDebateComments`)
  if (comment.post && comment.debateResponse) {
    // Get all the debate participants, but exclude the comment author if they're
    // a debate participant
    const debateParticipantIds = difference(
      [comment.post.userId, ...comment.post.coauthorUserIds],
      [comment.userId],
    );

    const debateSubscribers = await fetchSubscribedUsers({
      documentId: comment.post._id,
      collectionName: "Posts",
      type: subscriptionTypes.newDebateComments,
      potentiallyDefaultSubscribedUserIds: debateParticipantIds,
    });

    const debateSubscriberIds = debateSubscribers.map((sub) => sub._id);
    // Handle debate readers - filter out debate participants, since they get a
    // different notification type (we shouldn't have notified any users for
    // these comments previously, but leaving that in for sanity)
    const debateSubscriberIdsToNotify = difference(debateSubscriberIds, [
      ...debateParticipantIds,
      ...notifiedUsers,
      comment.userId,
    ]);
    await createNotifications({
      userIds: debateSubscriberIdsToNotify,
      notificationType: "newDebateComment",
      documentType: "comment",
      documentId: comment._id,
    });

    // Handle debate participants
    const subscribedParticipantIds = intersection(
      debateSubscriberIds,
      debateParticipantIds,
    );
    await createNotifications({
      userIds: subscribedParticipantIds,
      notificationType: "newDebateReply",
      documentType: "comment",
      documentId: comment._id,
    });

    // Avoid notifying users who are subscribed to both the debate comments and
    // regular comments on a debate twice
    notifiedUsers.push(...debateSubscriberIdsToNotify, ...subscribedParticipantIds);
  }

  // 3. Notify users who are subscribed to the post (which may or may not include
  // the post's author)
  let userIdsSubscribedToPost: string[] = [];
  if (comment.post) {
    const usersSubscribedToPost = await fetchSubscribedUsers({
      documentId: comment.post._id,
      collectionName: "Posts",
      type: subscriptionTypes.newComments,
      potentiallyDefaultSubscribedUserIds: comment.post
        ? [comment.post.userId, ...comment.post.coauthorUserIds]
        : [],
      userIsDefaultSubscribed: (u) => u.auto_subscribe_to_my_posts,
    });
    userIdsSubscribedToPost = usersSubscribedToPost.map(({ _id }) => _id);
  }

  // If the post is associated with a group, also (potentially) notify the group
  // organizers
  if (comment.post && comment.post.group) {
    const { organizerIds } = comment.post.group;
    if (organizerIds && organizerIds.length) {
      const subsWithOrganizers = await fetchSubscribedUsers({
        documentId: comment.post._id,
        collectionName: "Posts",
        type: subscriptionTypes.newComments,
        potentiallyDefaultSubscribedUserIds: organizerIds,
        userIsDefaultSubscribed: (u) => u.autoSubscribeAsOrganizer,
      });
      userIdsSubscribedToPost = union(
        userIdsSubscribedToPost,
        subsWithOrganizers.map(({ _id }) => _id),
      );
    }
  }

  // Notify users who are subscribed to shortform posts
  if (comment.post && !comment.topLevelCommentId && comment.shortform) {
    const usersSubscribedToShortform = await fetchSubscribedUsers({
      documentId: comment.post._id,
      collectionName: "Posts",
      type: subscriptionTypes.newShortform,
    });
    const userIdsSubscribedToShortform = usersSubscribedToShortform.map(
      ({ _id }) => _id,
    );
    await createNotifications({
      userIds: userIdsSubscribedToShortform,
      notificationType: "newShortform",
      documentType: "comment",
      documentId: comment._id,
    });
    notifiedUsers = [...userIdsSubscribedToShortform, ...notifiedUsers];
  }

  // remove userIds of users that have already been notified and of comment
  // author (they could be replying in a thread they're subscribed to)
  const postSubscriberIdsToNotify = difference(userIdsSubscribedToPost, [
    ...notifiedUsers,
    comment.userId,
  ]);
  if (postSubscriberIdsToNotify.length > 0) {
    await createNotifications({
      userIds: postSubscriberIdsToNotify,
      notificationType: "newComment",
      documentType: "comment",
      documentId: comment._id,
    });
    notifiedUsers = [...notifiedUsers, ...postSubscriberIdsToNotify];
  }

  // 4. If this comment is in a subforum, notify members with email notifications enabled
  if (
    comment.tagId &&
    comment.tagCommentType === "SUBFORUM" &&
    !comment.topLevelCommentId &&
    // FIXME: make this more general, and possibly queue up notifications from
    // unreviewed users to send once they are approved
    !comment.authorIsUnreviewed
  ) {
    const subforumSubcribedUsers = await db.query.users.findMany({
      columns: {
        _id: true,
      },
      where: {
        profileTagIds: { arrayContains: [comment.tagId] },
      },
    });
    const subforumSubscriberIds = subforumSubcribedUsers.map(({ _id }) => _id);
    const subforumSubscriberRels = await db.query.userTagRels.findMany({
      columns: {
        userId: true,
      },
      where: {
        userId: { in: subforumSubscriberIds },
        tagId: comment.tagId,
        subforumEmailNotifications: true,
      },
    });
    const subforumSubscriberIdsMaybeNotify = subforumSubscriberRels.map(
      ({ userId }) => userId,
    );
    const subforumSubscriberIdsToNotify = difference(
      subforumSubscriberIdsMaybeNotify,
      [...notifiedUsers, comment.userId],
    );
    await createNotifications({
      userIds: subforumSubscriberIdsToNotify,
      notificationType: "newSubforumComment",
      documentType: "comment",
      documentId: comment._id,
    });
  }

  // 5. Notify users who are subscribed to comments by the comment author
  const commentAuthorSubscribers = await fetchSubscribedUsers({
    documentId: comment.userId,
    collectionName: "Users",
    type: subscriptionTypes.newUserComments,
  });
  const commentAuthorSubscriberIds = commentAuthorSubscribers.map(({ _id }) => _id);
  const commentAuthorSubscriberIdsToNotify = difference(
    commentAuthorSubscriberIds,
    notifiedUsers,
  );
  await createNotifications({
    userIds: commentAuthorSubscriberIdsToNotify,
    notificationType: "newUserComment",
    documentType: "comment",
    documentId: comment._id,
  });
};

// "Not fully reviewed" per getReasonForReview — includes never-reviewed and
// currently-snoozed users.
const userIsUnreviewedForPangram = (user: CurrentUser): boolean => {
  const fullyReviewed = !!user.reviewedByUserId && !user.snoozedUntilContentCount;
  return !fullyReviewed;
};

export const runPangramOnComment = async (user: CurrentUser, revisionId: string) => {
  if (!userIsUnreviewedForPangram(user)) {
    return;
  }

  const revision = await db.query.revisions.findFirst({
    columns: {
      pangramCheckedAt: true,
    },
    where: {
      _id: revisionId,
    },
  });
  if (!revision || revision.pangramCheckedAt) {
    return;
  }

  await runPangramOnRevision(revisionId);
};
