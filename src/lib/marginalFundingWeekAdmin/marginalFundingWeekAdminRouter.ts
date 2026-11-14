import { z } from "zod/v4";
import { os } from "@orpc/server";
import { userIsAdmin } from "../users/userHelpers";
import { getCurrentUser } from "../users/currentUser";
import { setMarginalFundingWeekSequencePosts } from "./marginalFundingWeekAdminMutations";

export const marginalFundingWeekAdminRouter = {
  setSequencePosts: os
    .input(
      z.object({
        postIds: z.array(z.string().nonempty()).max(500),
      }),
    )
    .handler(async ({ input: { postIds } }) => {
      const currentUser = await getCurrentUser();
      if (!userIsAdmin(currentUser)) {
        throw new Error("Permission denied");
      }
      await setMarginalFundingWeekSequencePosts(currentUser, postIds);
    }),
};
