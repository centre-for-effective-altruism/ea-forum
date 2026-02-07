"use server";

import { z } from "zod/v4";
import { actionClient } from "../actionClient";
import { getCurrentUser } from "../users/currentUser";
import { fetchCommentsListItem, fetchFrontpageQuickTakes } from "./commentLists";
import { editorDataSchema } from "../ckeditor/editorHelpers";
import {
  createPostComment,
  updateCommentPinnedOnProfile,
  updateQuickTakeFrontpage,
} from "./commentMutations";

export const createPostCommentAction = actionClient
  .inputSchema(
    z.object({
      postId: z.string().optional(),
      shortform: z.boolean().optional(),
      parentCommentId: z.string().nullable().optional(),
      editorData: editorDataSchema,
      draft: z.boolean().optional(),
    }),
  )
  .action(
    async ({
      parsedInput: {
        postId,
        shortform,
        parentCommentId = null,
        editorData,
        draft = false,
      },
    }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("You must be logged in to comment");
      }
      const commentId = await createPostComment({
        user,
        postId,
        shortform,
        parentCommentId,
        editorData,
        draft,
      });
      return await fetchCommentsListItem({
        currentUser: user,
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
      currentUser,
      includeCommunity,
      offset,
      limit,
    });
  });

export const updateCommentPinnedOnProfileAction = actionClient
  .inputSchema(
    z.object({
      commentId: z.string(),
      pinned: z.boolean(),
    }),
  )
  .action(async ({ parsedInput: { commentId, pinned } }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Please login");
    }
    const isPinnedOnProfile = await updateCommentPinnedOnProfile(
      user,
      commentId,
      pinned,
    );
    return { isPinnedOnProfile };
  });

export const updateQuickTakeFrontpageAction = actionClient
  .inputSchema(
    z.object({
      commentId: z.string(),
      frontpage: z.boolean(),
    }),
  )
  .action(async ({ parsedInput: { commentId, frontpage } }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Please login");
    }
    const shortformFrontpage = await updateQuickTakeFrontpage(
      user,
      commentId,
      frontpage,
    );
    return { shortformFrontpage };
  });
