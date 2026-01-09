"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { posts } from "../schema";
import { upsertReadStatus } from "../readStatuses/readStatusQueries";
import { getCurrentUser } from "../users/currentUser";

export const increasePostViewCountAction = async (postId: string) => {
  await db
    .update(posts)
    .set({
      viewCount: sql`${posts.viewCount} + 1`,
    })
    .where(eq(posts._id, postId));
};

export const markPostCommentsReadAction = async (postId: string) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Not logged in");
  }
  await upsertReadStatus({
    postId,
    userId: currentUser._id,
    updateIsReadIfAlreadyExists: false,
  });
};
