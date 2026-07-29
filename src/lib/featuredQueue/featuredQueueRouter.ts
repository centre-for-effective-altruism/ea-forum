import z from "zod/v4";
import { os } from "@orpc/server";
import { userIsAdmin } from "../users/userHelpers";
import { getCurrentUser } from "../users/currentUser";
import { db } from "../db";
import { dismissPosts, featurePosts } from "./featuredQueueMutations";

const postIdList = z.array(z.string().nonempty()).max(200);

export const featuredQueueRouter = {
  publish: os
    .input(
      z.object({
        featurePostIds: postIdList.optional(),
        dismissPostIds: postIdList.optional(),
      }),
    )
    .handler(async ({ input }) => {
      const currentUser = await getCurrentUser();
      if (!userIsAdmin(currentUser)) {
        throw new Error("Permission denied");
      }
      const featurePostIds = input.featurePostIds ?? [];
      const dismissPostIds = input.dismissPostIds ?? [];
      if (featurePostIds.length === 0 && dismissPostIds.length === 0) {
        return { featuredCount: 0, dismissedCount: 0 };
      }
      return db.transaction(async (txn) => ({
        featuredCount: await featurePosts(featurePostIds, txn),
        dismissedCount: await dismissPosts(dismissPostIds, txn),
      }));
    }),
};
