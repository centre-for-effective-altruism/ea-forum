import keyBy from "lodash/keyBy";
import { os } from "@orpc/server";
import { z } from "zod/v4";
import type { GloballyBannedUserRow } from "./moderationTypes";
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
  toRateLimitDisplay,
  uniqueIds,
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
  listModeratorComments: os
    .input(paginationSchema)
    .handler(async ({ input: { page } }) => {
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
    }),
  listAutoRateLimits: os
    .input(
      paginationSchema.extend({
        showExpiredRateLimits: z.boolean().default(false),
        showNewUserRateLimits: z.boolean().default(false),
      }),
    )
    .handler(
      async ({ input: { page, showExpiredRateLimits, showNewUserRateLimits } }) => {
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
  listDeletedComments: os
    .input(paginationSchema)
    .handler(async ({ input: { page } }) => {
      const canViewModeratorActions = await canCurrentUserViewModeratorActions();
      const offset = (page - 1) * MODERATION_PAGE_SIZE;
      const data = await fetchDeletedComments({
        offset,
        limit: MODERATION_PAGE_SIZE,
      });
      const [postsMap, deletedByUsersMap] = await Promise.all([
        fetchPostsByIds(uniqueIds(data.comments.map((comment) => comment.postId))),
        fetchUsersByIds(
          uniqueIds(data.comments.map((comment) => comment.deletedByUserId)),
          { includeDeleted: canViewModeratorActions },
        ),
      ]);

      return {
        comments: data.comments,
        count: data.count,
        postMap: keyBy([...postsMap.values()], "_id"),
        deletedByUsersMap: keyBy([...deletedByUsersMap.values()], "_id"),
      };
    }),
  listModeratorActions: os
    .input(paginationSchema)
    .handler(async ({ input: { page } }) => {
      await moderationRoleGuard();

      const offset = (page - 1) * MODERATION_PAGE_SIZE;
      const data = await fetchModeratorActions({
        offset,
        limit: MODERATION_PAGE_SIZE,
      });
      const usersMap = await fetchUsersByIds(
        uniqueIds(data.actions.map((action) => action.userId)),
        { includeDeleted: true },
      );

      return {
        actions: data.actions,
        count: data.count,
        usersMap: keyBy([...usersMap.values()], "_id"),
      };
    }),
  listGloballyBannedUsers: os
    .input(
      paginationSchema.extend({
        showExpiredBans: z.boolean().default(false),
      }),
    )
    .handler(async ({ input: { page, showExpiredBans } }) => {
      await moderationRoleGuard();

      const offset = (page - 1) * MODERATION_PAGE_SIZE;
      const data = await fetchGloballyBannedUsers({
        offset,
        limit: MODERATION_PAGE_SIZE,
        showExpiredBans,
      });

      return {
        users: data.users as GloballyBannedUserRow[],
        count: data.count,
      };
    }),
  listManualRateLimits: os
    .input(paginationSchema)
    .handler(async ({ input: { page } }) => {
      await moderationRoleGuard();

      const offset = (page - 1) * MODERATION_PAGE_SIZE;
      const data = await fetchManualRateLimits({
        offset,
        limit: MODERATION_PAGE_SIZE,
      });
      const usersMap = await fetchUsersByIds(
        uniqueIds(data.actions.map((action) => action.userId)),
        { includeDeleted: true },
      );

      return {
        actions: data.actions,
        count: data.count,
        usersMap: keyBy([...usersMap.values()], "_id"),
      };
    }),
};
