import { eq, sql } from "drizzle-orm";
import { users, Post } from "../schema";
import type { DbOrTransaction } from "../db";

export const updatePostUser = async (txn: DbOrTransaction, post: Post) => {
  if (!post.userId) {
    return;
  }
  await txn
    .update(users)
    .set({
      postCount: sql<number>`${users.commentCount} + 1`,
      maxPostCount: sql<number>`GREATEST(${users.maxPostCount}, ${users.maxPostCount} + 1)`,
      ...(post.frontpageDate
        ? { frontpagePostCount: sql<number>`${users.frontpagePostCount} + 1` }
        : null),
      ...(post.shortform ? { shortformFeedId: post._id } : null),
    })
    .where(eq(users._id, post.userId));
};
