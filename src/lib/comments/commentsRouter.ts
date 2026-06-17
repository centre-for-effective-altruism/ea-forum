import { z } from "zod/v4";
import { os } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { editorDataSchema } from "../ckeditor/editorHelpers";
import { fetchCommentToEdit } from "./commentQueries";
import { forumEventCommentMetadataSchema } from "../forumEvents/forumEventHelpers";
import {
  fetchCommentsForForumEvent,
  fetchCommentsListItem,
  fetchFrontpageQuickTakes,
  fetchNewComments,
  fetchPopularComments,
} from "./commentLists";
import {
  createPostComment,
  deleteComment,
  toggleCommentRetracted,
  undeleteComment,
  updateComment,
  updateCommentPinnedOnProfile,
  updateQuickTakeFrontpage,
} from "./commentMutations";

export const commentsRouter = {
  listById: os
    .input(z.object({ _id: z.string().nonempty() }))
    .handler(async ({ input: { _id } }) => {
      const currentUser = await getCurrentUser();
      return await fetchCommentsListItem({
        currentUser,
        commentId: _id,
      });
    }),
  listByForumEvent: os
    .input(z.object({ forumEventId: z.string().nonempty() }))
    .handler(async ({ input: { forumEventId } }) => {
      const currentUser = await getCurrentUser();
      return await fetchCommentsForForumEvent({
        currentUser,
        forumEventId,
      });
    }),
  create: os
    .input(
      z.object({
        postId: z.string().optional(),
        shortform: z.boolean().optional(),
        parentCommentId: z.string().nullable().optional(),
        editorData: editorDataSchema,
        draft: z.boolean().optional(),
        shortformFrontpage: z.boolean().optional(),
        relevantTagIds: z.array(z.string().nonempty()).optional(),
        forumEventId: z.string().optional(),
        forumEventMetadata: forumEventCommentMetadataSchema.optional(),
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
          shortformFrontpage,
          relevantTagIds,
          forumEventId,
          forumEventMetadata,
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
          shortformFrontpage,
          relevantTagIds,
          forumEventId,
          forumEventMetadata,
        });
        return await fetchCommentsListItem({
          currentUser: user,
          commentId,
        });
      },
    ),
  edit: os
    .input(
      z.object({
        commentId: z.string(),
        editorData: editorDataSchema,
      }),
    )
    .handler(async ({ input: { commentId, editorData } }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("You must be logged in to comment");
      }
      await updateComment({
        user,
        commentId,
        editorData,
      });
      return await fetchCommentsListItem({
        currentUser: user,
        commentId,
      });
    }),
  fetchToEdit: os
    .input(z.object({ commentId: z.string() }))
    .handler(async ({ input: { commentId } }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Please login");
      }
      return await fetchCommentToEdit(user, commentId);
    }),
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
  listNew: os
    .input(
      z.object({
        postId: z.string().nonempty(),
        limit: z.number().min(0).max(50).optional(),
      }),
    )
    .handler(async ({ input: { postId, limit = 7 } }) => {
      const currentUser = await getCurrentUser();
      return await fetchNewComments(currentUser, postId, limit);
    }),
  listPopular: os
    .input(
      z.object({
        offset: z.number().min(0).optional(),
        limit: z.number().min(0).max(50).optional(),
      }),
    )
    .handler(async ({ input: { offset, limit } }) => {
      const currentUser = await getCurrentUser();
      return await fetchPopularComments({
        currentUser,
        offset,
        limit,
      });
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
  delete: os
    .input(
      z.object({
        commentId: z.string(),
        withoutTrace: z.boolean().optional(),
        reason: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Please login");
      }
      return await deleteComment({ user, ...input });
    }),
  undelete: os
    .input(z.object({ commentId: z.string() }))
    .handler(async ({ input: { commentId } }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Please login");
      }
      return await undeleteComment({ user, commentId });
    }),
  toggleRetracted: os
    .input(z.object({ commentId: z.string() }))
    .handler(async ({ input: { commentId } }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Please login");
      }
      return await toggleCommentRetracted({ user, commentId });
    }),
};
