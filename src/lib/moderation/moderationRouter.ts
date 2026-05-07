import { os } from "@orpc/server";
import { z } from "zod/v4";
import type { CommentsList } from "@/lib/comments/commentLists";
import type {
  AutoRateLimitRow,
  DeletedCommentRow,
  GloballyBannedUserRow,
  ModeratorActionRow,
  PostSummary,
  UserSummary,
} from "./moderationTypes";
import {
  fetchAutoRateLimits,
  fetchDeletedComments,
  fetchGloballyBannedUsers,
  fetchManualRateLimits,
  fetchModeratorActions,
  fetchModeratorComments,
  fetchPostsByIds,
  fetchUsersByIds,
} from "./moderationQueries";
import {
  MODERATION_PAGE_SIZE,
  MODERATOR_COMMENTS_PAGE_SIZE,
  redactDeletedCommentsForViewer,
  toRateLimitDisplay,
} from "./moderationTransforms";
import { getCurrentUser } from "@/lib/users/currentUser";
import { userIsModOrAdmin } from "@/lib/users/userHelpers";

const paginationSchema = z.object({
  page: z.number().int().min(1),
});

const moderationRoleGuard = async () => {
  const currentUser = await getCurrentUser();
  const canViewModeratorActions = userIsModOrAdmin(currentUser);

  if (!canViewModeratorActions) {
    throw new Error("Forbidden");
  }
};

const canCurrentUserViewModeratorActions = async () => {
  const currentUser = await getCurrentUser();
  return userIsModOrAdmin(currentUser);
};

export const moderationRouter = {
  listModeratorComments: os.input(paginationSchema).handler(
    async ({
      input: { page },
    }): Promise<{
      comments: CommentsList[];
      count: number;
    }> => {
      const currentUser = await getCurrentUser();
      const offset = (page - 1) * MODERATOR_COMMENTS_PAGE_SIZE;
      const data = await fetchModeratorComments({
        currentUser,
        offset,
        limit: MODERATOR_COMMENTS_PAGE_SIZE,
      });

      return {
        comments: data.comments,
        count: data.count,
      };
    },
  ),
  listAutoRateLimits: os
    .input(
      paginationSchema.extend({
        showExpiredRateLimits: z.boolean().default(false),
        showNewUserRateLimits: z.boolean().default(false),
      }),
    )
    .handler(
      async ({
        input: { page, showExpiredRateLimits, showNewUserRateLimits },
      }): Promise<{
        rows: AutoRateLimitRow[];
        count: number;
      }> => {
        const offset = (page - 1) * MODERATION_PAGE_SIZE;
        const data = await fetchAutoRateLimits({
          offset,
          limit: MODERATION_PAGE_SIZE,
          showExpiredRateLimits,
          showNewUserRateLimits,
        });

        return {
          rows: toRateLimitDisplay(data.rows),
          count: data.count,
        };
      },
    ),
  listDeletedComments: os.input(paginationSchema).handler(
    async ({
      input: { page },
    }): Promise<{
      comments: DeletedCommentRow[];
      count: number;
      postMap: Record<string, PostSummary>;
      deletedByUsersMap: Record<string, UserSummary>;
    }> => {
      const canViewModeratorActions = await canCurrentUserViewModeratorActions();
      const offset = (page - 1) * MODERATION_PAGE_SIZE;
      const data = await fetchDeletedComments({
        offset,
        limit: MODERATION_PAGE_SIZE,
      });
      const [postMap, deletedByUsersMap] = await Promise.all([
        fetchPostsByIds(data.comments.map((comment) => comment.postId)),
        fetchUsersByIds(
          data.comments.map((comment) => comment.deletedByUserId),
          { includeDeleted: canViewModeratorActions },
        ),
      ]);

      return {
        comments: redactDeletedCommentsForViewer(
          data.comments,
          canViewModeratorActions,
        ),
        count: data.count,
        postMap,
        deletedByUsersMap,
      };
    },
  ),
  listModeratorActions: os.input(paginationSchema).handler(
    async ({
      input: { page },
    }): Promise<{
      actions: ModeratorActionRow[];
      count: number;
      usersMap: Record<string, UserSummary>;
    }> => {
      await moderationRoleGuard();

      const offset = (page - 1) * MODERATION_PAGE_SIZE;
      const data = await fetchModeratorActions({
        offset,
        limit: MODERATION_PAGE_SIZE,
      });
      const usersMap = await fetchUsersByIds(
        data.actions.map((action) => action.userId),
        { includeDeleted: true },
      );

      return {
        actions: data.actions,
        count: data.count,
        usersMap,
      };
    },
  ),
  listGloballyBannedUsers: os
    .input(
      paginationSchema.extend({
        showExpiredBans: z.boolean().default(false),
      }),
    )
    .handler(
      async ({
        input: { page, showExpiredBans },
      }): Promise<{
        users: GloballyBannedUserRow[];
        count: number;
      }> => {
        await moderationRoleGuard();

        const offset = (page - 1) * MODERATION_PAGE_SIZE;
        const data = await fetchGloballyBannedUsers({
          offset,
          limit: MODERATION_PAGE_SIZE,
          showExpiredBans,
        });

        return {
          users: data.users,
          count: data.count,
        };
      },
    ),
  listManualRateLimits: os.input(paginationSchema).handler(
    async ({
      input: { page },
    }): Promise<{
      actions: ModeratorActionRow[];
      count: number;
      usersMap: Record<string, UserSummary>;
    }> => {
      await moderationRoleGuard();

      const offset = (page - 1) * MODERATION_PAGE_SIZE;
      const data = await fetchManualRateLimits({
        offset,
        limit: MODERATION_PAGE_SIZE,
      });
      const usersMap = await fetchUsersByIds(
        data.actions.map((action) => action.userId),
        { includeDeleted: true },
      );

      return {
        actions: data.actions,
        count: data.count,
        usersMap,
      };
    },
  ),
};
