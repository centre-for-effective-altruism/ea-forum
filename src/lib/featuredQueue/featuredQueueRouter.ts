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
      return db.transaction(async (txn) => {
        const featured = await featurePosts(input.featurePostIds, txn);
        const dismissed = await dismissPosts(input.dismissPostIds, txn);
        return {
          featuredCount: featured.count,
          dismissedCount: dismissed.count,
          // Anything that couldn't be recorded stays in the queue, so say so
          // rather than reporting a clean run.
          skippedPostIds: [...featured.skippedPostIds, ...dismissed.skippedPostIds],
        };
      });
    }),
};
