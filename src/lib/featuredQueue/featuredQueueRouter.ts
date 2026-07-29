import z from "zod/v4";
import { os } from "@orpc/server";
import { userIsAdmin } from "../users/userHelpers";
import { getCurrentUser } from "../users/currentUser";
import { db } from "../db";
import { dismissPosts, featurePosts } from "./featuredQueueMutations";

const postIdList = z.array(z.string().nonempty()).max(200).default([]);

export const featuredQueueRouter = {
  publish: os
    .input(
      z.object({
        featurePostIds: postIdList,
        dismissPostIds: postIdList,
      }),
    )
    .handler(async ({ input }) => {
      const currentUser = await getCurrentUser();
      if (!userIsAdmin(currentUser)) {
        throw new Error("Permission denied");
      }
      // featurePosts / dismissPosts each no-op on an empty list.
      return db.transaction(async (txn) => ({
        featuredCount: await featurePosts(input.featurePostIds, txn),
        dismissedCount: await dismissPosts(input.dismissPostIds, txn),
      }));
    }),
};
