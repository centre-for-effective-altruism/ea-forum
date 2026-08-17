import { os } from "@orpc/server";
import z from "zod/v4";
import { getCurrentUser } from "../users/currentUser";
import { countCommentAwardsUsed } from "./commentAwardQueries";
import { createCommentAward, deleteCommentAward } from "./commentAwardMutations";

export const commentAwardsRouter = {
  create: os
    .input(z.object({ commentId: z.string().nonempty() }))
    .handler(async ({ input: { commentId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      return await createCommentAward(currentUser, commentId);
    }),
  delete: os
    .input(z.object({ commentId: z.string().nonempty() }))
    .handler(async ({ input: { commentId } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      return await deleteCommentAward(currentUser, commentId);
    }),
  countUsed: os.handler(async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Please login");
    }
    return await countCommentAwardsUsed(currentUser);
  }),
};
