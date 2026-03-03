import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { os } from "@orpc/server";
import { db } from "../db";
import { posts } from "../schema";
import { upsertReadStatus } from "../readStatuses/readStatusQueries";
import { getCurrentUser } from "../users/currentUser";
import { fetchPostsListFromView } from "./postLists";
import { postsListViewSchema } from "./postsHelpers";
import {
  archiveDraft,
  moveToDraft,
  setAsQuickTakesPost,
  toggleEnableRecommendation,
  toggleFrontpage,
  toggleSuggestedForCuration,
} from "./postMutations";

export const postsRouter = {
  list: os.input(postsListViewSchema).handler(async ({ input: view }) => {
    const currentUser = await getCurrentUser();
    if (typeof view.limit === "number" && (view.limit < 1 || view.limit > 50)) {
      throw new Error("Invalid limit");
    }
    if (typeof view.offset === "number" && view.offset < 0) {
      throw new Error("Invalid offset");
    }
    return fetchPostsListFromView(currentUser?._id ?? null, view);
  }),
  incrementViewCount: os
    .input(z.object({ postId: z.string() }))
    .handler(async ({ input: { postId } }) => {
      await db
        .update(posts)
        .set({
          viewCount: sql`${posts.viewCount} + 1`,
        })
        .where(eq(posts._id, postId));
    }),
  markCommentsRead: os
    .input(z.object({ postId: z.string() }))
    .handler(async ({ input: { postId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Not logged in");
      }
      await upsertReadStatus({
        postId,
        userId: currentUser._id,
        updateIsReadIfAlreadyExists: false,
      });
    }),
  toggleSuggestedForCuration: os
    .input(z.object({ postId: z.string() }))
    .handler(async ({ input: { postId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Not logged in");
      }
      await toggleSuggestedForCuration(currentUser, postId);
    }),
  setAsQuickTakesPost: os
    .input(z.object({ postId: z.string() }))
    .handler(async ({ input: { postId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Not logged in");
      }
      await setAsQuickTakesPost(currentUser, postId);
    }),
  toggleEnableRecommendations: os
    .input(z.object({ postId: z.string() }))
    .handler(async ({ input: { postId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Not logged in");
      }
      await toggleEnableRecommendation(currentUser, postId);
    }),
  toggleFrontpage: os
    .input(z.object({ postId: z.string() }))
    .handler(async ({ input: { postId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Not logged in");
      }
      await toggleFrontpage(currentUser, postId);
    }),
  moveToDraft: os
    .input(z.object({ postId: z.string() }))
    .handler(async ({ input: { postId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Not logged in");
      }
      await moveToDraft(currentUser, postId);
    }),
  archiveDraft: os
    .input(z.object({ postId: z.string() }))
    .handler(async ({ input: { postId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Not logged in");
      }
      await archiveDraft(currentUser, postId);
    }),
};
