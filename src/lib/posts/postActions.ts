"use server";

import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { actionClient } from "../actionClient";
import { db } from "../db";
import { posts } from "../schema";
import { upsertReadStatus } from "../readStatuses/readStatusQueries";
import { getCurrentUser } from "../users/currentUser";
import { fetchPostsListFromView } from "./postLists";
import { postsListViewSchema } from "./postsHelpers";
import {
  setAsQuickTakesPost,
  toggleEnableRecommendation,
  toggleFrontpage,
  toggleSuggestedForCuration,
} from "./postMutations";

export const fetchPostsListAction = actionClient
  .inputSchema(postsListViewSchema)
  .action(async ({ parsedInput: view }) => {
    const currentUser = await getCurrentUser();
    if (typeof view.limit === "number" && (view.limit < 1 || view.limit > 50)) {
      throw new Error("Invalid limit");
    }
    if (typeof view.offset === "number" && view.offset < 0) {
      throw new Error("Invalid offset");
    }
    return fetchPostsListFromView(currentUser?._id ?? null, view);
  });

export const increasePostViewCountAction = actionClient
  .inputSchema(z.object({ postId: z.string() }))
  .action(async ({ parsedInput: { postId } }) => {
    await db
      .update(posts)
      .set({
        viewCount: sql`${posts.viewCount} + 1`,
      })
      .where(eq(posts._id, postId));
  });

export const markPostCommentsReadAction = actionClient
  .inputSchema(z.object({ postId: z.string() }))
  .action(async ({ parsedInput: { postId } }) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Not logged in");
    }
    await upsertReadStatus({
      postId,
      userId: currentUser._id,
      updateIsReadIfAlreadyExists: false,
    });
  });

export const toggleSuggestedForCurationAction = actionClient
  .inputSchema(z.object({ postId: z.string() }))
  .action(async ({ parsedInput: { postId } }) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Not logged in");
    }
    await toggleSuggestedForCuration(currentUser, postId);
  });

export const setAsQuickTakesPostAction = actionClient
  .inputSchema(z.object({ postId: z.string() }))
  .action(async ({ parsedInput: { postId } }) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Not logged in");
    }
    await setAsQuickTakesPost(currentUser, postId);
  });

export const toggleEnableRecommendationAction = actionClient
  .inputSchema(z.object({ postId: z.string() }))
  .action(async ({ parsedInput: { postId } }) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Not logged in");
    }
    await toggleEnableRecommendation(currentUser, postId);
  });

export const toggleFrontpageAction = actionClient
  .inputSchema(z.object({ postId: z.string() }))
  .action(async ({ parsedInput: { postId } }) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Not logged in");
    }
    await toggleFrontpage(currentUser, postId);
  });
