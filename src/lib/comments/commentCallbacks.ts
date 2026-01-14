import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { tags, Comment, posts, readStatuses, comments, users } from "@/lib/schema";
import { Transaction } from "../db";
import { getCommentAncestorIds } from "./commentQueries";

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
  const ancestorIds = await getCommentAncestorIds(comment._id, txn);
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
