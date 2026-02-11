import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { fetchCommentsListItem, fetchFrontpageQuickTakes } from "./commentLists";
import { editorDataSchema } from "../ckeditor/editorHelpers";
import {
  createPostComment,
  updateCommentPinnedOnProfile,
  updateQuickTakeFrontpage,
} from "./commentMutations";

export const commentsRouter = {
  create: os
    .input(
      z.object({
        postId: z.string().optional(),
        shortform: z.boolean().optional(),
        parentCommentId: z.string().nullable().optional(),
        editorData: editorDataSchema,
        draft: z.boolean().optional(),
      }),
    )
    .handler(
      async ({
        input: {
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
    ),
  updatePinnedOnProfile: os
    .input(
      z.object({
        commentId: z.string(),
        pinned: z.boolean(),
      }),
    )
    .handler(async ({ input: { commentId, pinned } }) => {
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
    }),
  listQuickTakes: os
    .input(
      z.object({
        includeCommunity: z.boolean().optional(),
        offset: z.number().min(0).optional(),
        limit: z.number().min(0).max(50).optional(),
      }),
    )
    .handler(async ({ input: { includeCommunity, offset, limit } }) => {
      const currentUser = await getCurrentUser();
      return await fetchFrontpageQuickTakes({
        currentUser,
        includeCommunity,
        offset,
        limit,
      });
    }),
  updateQuickTakeFrontpage: os
    .input(
      z.object({
        commentId: z.string(),
        frontpage: z.boolean(),
      }),
    )
    .handler(async ({ input: { commentId, frontpage } }) => {
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
    }),
};
