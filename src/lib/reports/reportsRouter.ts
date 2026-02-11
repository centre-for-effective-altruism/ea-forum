import { os } from "@orpc/server";
import { z } from "zod/v4";
import { getCurrentUser } from "../users/currentUser";
import { createCommentReport, createPostReport } from "./reportMutations";

export const reportsRouter = {
  createPost: os
    .input(
      z.object({
        postId: z.string(),
        description: z.string(),
      }),
    )
    .handler(async ({ input: { postId, description } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await createPostReport(currentUser, postId, description);
    }),
  createComment: os
    .input(
      z.object({
        commentId: z.string(),
        description: z.string(),
      }),
    )
    .handler(async ({ input: { commentId, description } }) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("Please login");
      }
      await createCommentReport(currentUser, commentId, description);
    }),
};
