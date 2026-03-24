import { getCurrentUser } from "@/lib/users/currentUser";
import keyBy from "lodash/keyBy";
import { userIsModOrAdmin } from "@/lib/users/userHelpers";
import type { GloballyBannedUserRow } from "@/lib/moderation/moderationTypes";
import {
  fetchAutoRateLimits,
  fetchDeletedComments,
  fetchGloballyBannedUsers,
  fetchManualRateLimits,
  fetchModeratorActions,
  fetchModeratorComments,
  fetchPostsByIds,
  fetchUsersByIds,
} from "@/lib/moderation/moderationQueries";
import {
  MODERATION_PAGE_SIZE,
  MODERATOR_COMMENTS_PAGE_SIZE,
  toRateLimitDisplay,
  uniqueIds,
} from "@/lib/moderation/moderationTransforms";
import ModerationPageContentClient from "./ModerationPageContentClient";
import type { ModerationPageInitialData } from "./moderationPageClientTypes";

export default async function ModerationPageContent() {
  const currentUser = await getCurrentUser();
  // For now, we're including some sections only visible to mods & admins.
  // We may later make these public or move them elsewhere.
  const canViewModeratorActions = userIsModOrAdmin(currentUser);

  const [moderatorCommentsData, deletedCommentsData, autoRateLimitsData] =
    await Promise.all([
      fetchModeratorComments({
        currentUser,
        offset: 0,
        limit: MODERATOR_COMMENTS_PAGE_SIZE,
      }),
      fetchDeletedComments({ offset: 0, limit: MODERATION_PAGE_SIZE }),
      fetchAutoRateLimits({
        offset: 0,
        limit: MODERATION_PAGE_SIZE,
        showExpiredRateLimits: false,
        showNewUserRateLimits: false,
      }),
    ]);

  const [deletedCommentPostsMap, deletedByUsersMap] = await Promise.all([
    fetchPostsByIds(
      uniqueIds(deletedCommentsData.comments.map((comment) => comment.postId)),
    ),
    fetchUsersByIds(
      uniqueIds(
        deletedCommentsData.comments.map((comment) => comment.deletedByUserId),
      ),
      { includeDeleted: canViewModeratorActions },
    ),
  ]);

  const autoRateLimits = toRateLimitDisplay(autoRateLimitsData.rows);

  const [moderatorActionsData, globallyBannedUsersData, manualRateLimitsData] =
    canViewModeratorActions
      ? await Promise.all([
          fetchModeratorActions({ offset: 0, limit: MODERATION_PAGE_SIZE }),
          fetchGloballyBannedUsers({
            offset: 0,
            limit: MODERATION_PAGE_SIZE,
            showExpiredBans: false,
          }),
          fetchManualRateLimits({ offset: 0, limit: MODERATION_PAGE_SIZE }),
        ])
      : [
          { actions: [], count: 0 },
          { users: [], count: 0 },
          { actions: [], count: 0 },
        ];

  const [moderatorActionUsers, manualRateLimitUsers] = await Promise.all([
    fetchUsersByIds(
      uniqueIds(moderatorActionsData.actions.map((action) => action.userId)),
      { includeDeleted: canViewModeratorActions },
    ),
    fetchUsersByIds(
      uniqueIds(manualRateLimitsData.actions.map((action) => action.userId)),
      { includeDeleted: canViewModeratorActions },
    ),
  ]);

  const initialData: ModerationPageInitialData = {
    canViewModeratorActions,
    moderatorComments: moderatorCommentsData.comments,
    moderatorCommentsTotalCount: moderatorCommentsData.count,
    autoRateLimits,
    autoRateLimitsTotalCount: autoRateLimitsData.count,
    deletedComments: deletedCommentsData.comments,
    deletedCommentsTotalCount: deletedCommentsData.count,
    deletedCommentPosts: keyBy([...deletedCommentPostsMap.values()], "_id"),
    deletedCommentDeletedByUsers: keyBy([...deletedByUsersMap.values()], "_id"),
    moderatorActions: moderatorActionsData.actions,
    moderatorActionsTotalCount: moderatorActionsData.count,
    moderatorActionUsers: keyBy([...moderatorActionUsers.values()], "_id"),
    globallyBannedUsers: globallyBannedUsersData.users as GloballyBannedUserRow[],
    globallyBannedUsersTotalCount: globallyBannedUsersData.count,
    manualRateLimits: manualRateLimitsData.actions,
    manualRateLimitsTotalCount: manualRateLimitsData.count,
    manualRateLimitUsers: keyBy([...manualRateLimitUsers.values()], "_id"),
  };

  return <ModerationPageContentClient initialData={initialData} />;
}
