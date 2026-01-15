import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { DbOrTransaction, Transaction } from "../db";
import type { CurrentUser } from "../users/currentUser";
import type { ForumEventCommentMetadata } from "../forumEvents/forumEventHelpers";
import { postGetPageUrl } from "../posts/postsHelpers";
import { akismetCheckComment } from "../akismet";
import { getCommentAncestorIds, PostForCommentCreation } from "./commentQueries";
import { rateLimitDateWhenUserNextAbleToComment } from "./commentRateLimits";
import { captureEvent } from "../analytics/captureEvent";
import {
  tags,
  Comment,
  posts,
  readStatuses,
  comments,
  users,
  Revision,
} from "@/lib/schema";
import { upsertForumEventSticker } from "../forumEvents/forumEventQueries";

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
  const ancestorIds = await getCommentAncestorIds(txn, comment._id);
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

export const addForumEventSticker = async (txn: Transaction, comment: Comment) => {
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

  console.warn("Deleting comment from user below spam threshold:", commentId);
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
