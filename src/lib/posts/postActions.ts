"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { posts } from "../schema";
import { upsertReadStatus } from "../readStatuses/readStatusQueries";
import { getCurrentUser } from "../users/currentUser";
import { fetchPostsListFromView } from "./postLists";
import type { PostsListView } from "./postsHelpers";

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

export const fetchPostsListAction = async (view: PostsListView) => {
  const currentUser = await getCurrentUser();
  if (typeof view.limit === "number" && (view.limit < 1 || view.limit > 50)) {
    throw new Error("Invalid limit");
  }
  if (typeof view.offset === "number" && view.offset < 0) {
    throw new Error("Invalid offset");
  }
  return fetchPostsListFromView(currentUser?._id ?? null, view);
};
