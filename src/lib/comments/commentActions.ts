"use server";

import { z } from "zod/v4";
import { actionClient } from "../actionClient";
import { getCurrentUser } from "../users/currentUser";
import { createPostComment } from "./commentMutations";
import { fetchCommentsListItem, fetchFrontpageQuickTakes } from "./commentLists";
import { editorDataSchema } from "../ckeditor/editorHelpers";

export const createPostCommentAction = actionClient
  .inputSchema(
    z.object({
      postId: z.string(),
      parentCommentId: z.string().nullable().optional(),
      editorData: editorDataSchema,
      draft: z.boolean().optional(),
    }),
  )
  .action(
    async ({
      parsedInput: { postId, parentCommentId = null, editorData, draft = false },
    }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("You must be logged in to comment");
      }
      const commentId = await createPostComment({
        user,
        postId,
        parentCommentId,
        editorData,
        draft,
      });
      return await fetchCommentsListItem({
        currentUserId: user._id,
        commentId,
      });
    },
  );

export const fetchQuickTakesAction = actionClient
  .inputSchema(
    z.object({
      includeCommunity: z.boolean().optional(),
      offset: z.number().min(0).optional(),
      limit: z.number().min(0).max(50).optional(),
    }),
  )
  .action(async ({ parsedInput: { includeCommunity, offset, limit } }) => {
    const currentUser = await getCurrentUser();
    return await fetchFrontpageQuickTakes({
      currentUserId: currentUser?._id ?? null,
      includeCommunity,
      offset,
      limit,
    });
  });
