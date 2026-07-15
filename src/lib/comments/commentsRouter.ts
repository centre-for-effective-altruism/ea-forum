import { z } from "zod/v4";
import { os, ORPCError } from "@orpc/server";
import { getCurrentUser } from "../users/currentUser";
import { editorDataSchema } from "../ckeditor/editorHelpers";
import { fetchCommentToEdit } from "./commentQueries";
import { forumEventCommentMetadataSchema } from "../forumEvents/forumEventHelpers";
import {
  countFrontpageQuickTakes,
  fetchCommentReplies,
  fetchCommentsForForumEvent,
  fetchCommentsListItem,
  fetchFrontpageQuickTakes,
  fetchNewComments,
  fetchPopularComments,
} from "./commentLists";
import {
  createPostComment,
  deleteComment,
  lockCommentThread,
  toggleCommentRetracted,
  toggleModeratorComment,
  undeleteComment,
  unlockCommentThread,
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
  listReplies: os
    .input(z.object({ commentId: z.string().nonempty() }))
    .handler(async ({ input: { commentId } }) => {
      const currentUser = await getCurrentUser();
      return await fetchCommentReplies({
        currentUser,
        commentId,
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
        // TEMPORARY DIAGNOSTIC: surface the real server error in the client
        // toast so we can pin down why poll comments fail on the live DB.
        // Revert once the poll-comment 500 is understood.
        try {
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
        } catch (e) {
          // Walk the error/cause chain and pull out the underlying Postgres
          // fields (message/detail/constraint/column/table), which carry the
          // real reason the insert was rejected.
          const parts: string[] = [];
          let current: unknown = e;
          for (let depth = 0; current && depth < 5; depth++) {
            if (current instanceof Error) {
              parts.push(`${current.name}: ${current.message}`);
            } else {
              parts.push(String(current));
            }
            const pg = current as Record<string, unknown>;
            for (const key of [
              "code",
              "detail",
              "constraint",
              "column",
              "table",
            ]) {
              if (pg[key]) {
                parts.push(`${key}=${String(pg[key])}`);
              }
            }
            current =
              current && typeof current === "object" && "cause" in current
                ? (current as { cause?: unknown }).cause
                : undefined;
          }
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: `DIAG createPostComment failed — ${parts.join(" | ")}`,
            cause: e,
          });
        }
      },
    ),
  edit: os
    .input(
      z.object({
        commentId: z.string(),
        editorData: editorDataSchema,
        draft: z.boolean().optional(),
      }),
    )
    .handler(async ({ input: { commentId, editorData, draft } }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("You must be logged in to comment");
      }
      await updateComment({
        user,
        commentId,
        editorData,
        draft,
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
      const [items, totalCount] = await Promise.all([
        fetchFrontpageQuickTakes({
          currentUser,
          includeCommunity,
          offset,
          limit,
        }),
        // Only the first page needs the total; later pages reuse the count the
        // client already has, avoiding a redundant COUNT(*) per "load more".
        offset
          ? Promise.resolve(undefined)
          : countFrontpageQuickTakes({ currentUser, includeCommunity }),
      ]);
      return { items, totalCount };
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
  lockThread: os
    .input(z.object({ commentId: z.string(), until: z.date().nullable() }))
    .handler(async ({ input: { commentId, until } }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Please login");
      }
      return await lockCommentThread({ user, commentId, until });
    }),
  unlockThread: os
    .input(z.object({ commentId: z.string() }))
    .handler(async ({ input: { commentId } }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Please login");
      }
      return await unlockCommentThread({ user, commentId });
    }),
  toggleModerator: os
    .input(z.object({ commentId: z.string() }))
    .handler(async ({ input: { commentId } }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Please login");
      }
      return await toggleModeratorComment({ user, commentId });
    }),
};
