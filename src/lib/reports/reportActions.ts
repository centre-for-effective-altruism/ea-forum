"use server";

import { z } from "zod/v4";
import { actionClient } from "../actionClient";
import { getCurrentUser } from "../users/currentUser";
import { createCommentReport, createPostReport } from "./reportMutations";

export const createPostReportAction = actionClient
  .inputSchema(
    z.object({
      postId: z.string(),
      description: z.string(),
    }),
  )
  .action(async ({ parsedInput: { postId, description } }) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Please login");
    }
    await createPostReport(currentUser, postId, description);
  });

export const createCommentReportAction = actionClient
  .inputSchema(
    z.object({
      commentId: z.string(),
      description: z.string(),
    }),
  )
  .action(async ({ parsedInput: { commentId, description } }) => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Please login");
    }
    await createCommentReport(currentUser, commentId, description);
  });
