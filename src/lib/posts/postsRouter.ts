import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { os } from "@orpc/server";
import { db } from "../db";
import { posts } from "../schema";
import { upsertReadStatus } from "../readStatuses/readStatusQueries";
import { getCurrentUser } from "../users/currentUser";
import { postsListViewSchema } from "./postsHelpers";
import { allPostsSettingsSchema } from "./allPostsSettings";
import {
  fetchAllPosts,
  fetchFeaturedFrontpagePosts,
  fetchPostsListById,
  fetchPostsListByIds,
  fetchPostsListFromView,
} from "./postLists";
import {
  deleteDraft,
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
  listById: os
    .input(z.object({ _id: z.string() }))
    .handler(async ({ input: { _id } }) => {
      const currentUser = await getCurrentUser();
      return fetchPostsListById(currentUser?._id ?? null, _id);
    }),
  listByIds: os
    .input(z.object({ postIds: z.string().array() }))
    .handler(async ({ input: { postIds } }) => {
      const currentUser = await getCurrentUser();
      return fetchPostsListByIds(currentUser?._id ?? null, postIds);
    }),
  listFeatured: os
    .input(
      z.object({
        offset: z.number().nonnegative().max(1000).optional(),
        limit: z.number().positive().default(10).optional(),
      }),
    )
    .handler(async ({ input: { offset, limit } }) => {
      const currentUser = await getCurrentUser();
      return fetchFeaturedFrontpagePosts({
        currentUser,
        offset,
        limit,
      });
    }),
  listAll: os
    .input(
      z.object({
        settings: allPostsSettingsSchema,
        before: z.coerce.date().optional(),
        after: z.coerce.date().optional(),
        offset: z.number().nonnegative().max(5000).optional(),
        limit: z.number().positive().default(10).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const currentUser = await getCurrentUser();
      return await fetchAllPosts({ currentUser, ...input });
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
  deleteDraft: os
    .input(z.object({ postId: z.string() }))
    .handler(async ({ input: { postId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Not logged in");
      }
      await deleteDraft(currentUser, postId);
    }),
};
