import z from "zod/v4";
import { os } from "@orpc/server";
import { userIsAdmin } from "../users/userHelpers";
import { getCurrentUser } from "../users/currentUser";
import { featurePosts } from "./featuredQueueMutations";

export const featuredQueueRouter = {
  publish: os
    .input(
      z.object({
        postIds: z.array(z.string().nonempty()).min(1).max(200),
      }),
    )
    .handler(async ({ input: { postIds } }) => {
      const currentUser = await getCurrentUser();
      if (!userIsAdmin(currentUser)) {
        throw new Error("Permission denied");
      }
      return { featuredCount: await featurePosts(postIds) };
    }),
};
