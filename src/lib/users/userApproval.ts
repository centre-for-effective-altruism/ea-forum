import { waitUntil } from "@vercel/functions";
import { captureException } from "@sentry/nextjs";
import { and, eq, sql } from "drizzle-orm";
import groupBy from "lodash/groupBy";
import maxBy from "lodash/maxBy";
import type { CurrentUser } from "./currentUser";
import { updateWithFieldChanges } from "../fieldChanges";
import { db } from "../db";
import { comments, posts, users } from "../schema";
import { userCanDo } from "./userHelpers";
import {
  elasticSyncDocument,
  elasticSyncDocuments,
} from "../search/elastic/elasticSync";
import { commentIncludedInCounts } from "../comments/commentHelpers";
import { newCommentNotifications } from "../comments/commentCallbacks";
import { newPostNotifications } from "../posts/postCallbacks";

export const approveUnreviewedSubmissions = async (userId: string) => {
  const { approvedPosts, approvedComments } = await db.transaction(async (txn) => {
    const approvedPosts = await txn
      .update(posts)
      .set({ authorIsUnreviewed: false, postedAt: new Date().toISOString() })
      .where(and(eq(posts.userId, userId), eq(posts.authorIsUnreviewed, true)))
      .returning();
    const approvedComments = await txn
      .update(comments)
      .set({ authorIsUnreviewed: false })
      .where(and(eq(comments.userId, userId), eq(comments.authorIsUnreviewed, true)))
      .returning();
    const countedComments = approvedComments.filter(
      (comment) => comment.postId && commentIncludedInCounts(comment),
    );
    for (const [postId, postComments] of Object.entries(
      groupBy(countedComments, "postId"),
    )) {
      const topLevelCount = postComments.filter(
        ({ parentCommentId }) => !parentCommentId,
      ).length;
      const latestPostedAt = (comments: typeof postComments) =>
        maxBy(comments, ({ postedAt }) => new Date(postedAt).getTime())?.postedAt;
      const lastCommentedAt = latestPostedAt(postComments);
      const lastReplyAt = latestPostedAt(
        postComments.filter(({ parentCommentId }) => parentCommentId),
      );
      await txn
        .update(posts)
        .set({
          commentCount: sql<number>`${posts.commentCount} + ${postComments.length}`,
          topLevelCommentCount: sql<number>`${posts.topLevelCommentCount} + ${topLevelCount}`,
          lastCommentedAt: sql`GREATEST(${posts.lastCommentedAt}, ${lastCommentedAt}::TIMESTAMPTZ)`,
          ...(lastReplyAt
            ? {
                lastCommentReplyAt: sql`GREATEST(${posts.lastCommentReplyAt}, ${lastReplyAt}::TIMESTAMPTZ)`,
              }
            : null),
        })
        .where(eq(posts._id, postId));
    }
    return { approvedPosts, approvedComments };
  });
  waitUntil(
    elasticSyncDocuments([
      ["Posts", approvedPosts.map(({ _id }) => _id)],
      ["Comments", approvedComments.map(({ _id }) => _id)],
    ]),
  );
  waitUntil(
    Promise.all([
      ...approvedPosts.map(({ _id }) => newPostNotifications(_id)),
      ...approvedComments.map(({ _id }) => newCommentNotifications(_id)),
    ]).catch((e) => {
      console.error(e);
      captureException(e);
    }),
  );
};

export const approveNewUser = async (
  currentUser: CurrentUser,
  userIdToApprove: string,
) => {
  if (!userCanDo(currentUser, "posts.edit.all")) {
    throw new Error("Permission denied");
  }
  await updateWithFieldChanges(db, currentUser, users, userIdToApprove, {
    reviewedByUserId: currentUser._id,
    sunshineFlagged: false,
    reviewedAt: new Date().toISOString(),
    needsReview: false,
    snoozedUntilContentCount: null,
  });
  await approveUnreviewedSubmissions(userIdToApprove);
  waitUntil(elasticSyncDocument("Users", userIdToApprove));
};
