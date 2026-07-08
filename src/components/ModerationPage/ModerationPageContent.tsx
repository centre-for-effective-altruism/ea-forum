import { getCurrentUser } from "@/lib/users/currentUser";
import { userIsAdminOrMod } from "@/lib/users/userHelpers";
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
  redactDeletedCommentsForViewer,
  toRateLimitDisplay,
} from "@/lib/moderation/moderationTransforms";
import ModerationPageContentClient from "./ModerationPageContentClient";
import type { ModerationPageInitialData } from "./moderationPageClientTypes";

export default async function ModerationPageContent() {
  const currentUser = await getCurrentUser();
  // For now, we're including some sections only visible to mods & admins.
  // We may later make these public or move them elsewhere.
  const canViewModeratorActions = userIsAdminOrMod(currentUser);

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

  const [
    deletedCommentPosts,
    deletedCommentDeletedByUsers,
    moderatorActionsData,
    globallyBannedUsersData,
    manualRateLimitsData,
  ] = await Promise.all([
    fetchPostsByIds(deletedCommentsData.comments.map((comment) => comment.postId)),
    fetchUsersByIds(
      deletedCommentsData.comments.map((comment) => comment.deletedByUserId),
      { includeDeleted: canViewModeratorActions },
    ),
    canViewModeratorActions
      ? fetchModeratorActions({ offset: 0, limit: MODERATION_PAGE_SIZE })
      : Promise.resolve({ actions: [], count: 0 }),
    canViewModeratorActions
      ? fetchGloballyBannedUsers({
          offset: 0,
          limit: MODERATION_PAGE_SIZE,
          showExpiredBans: false,
        })
      : Promise.resolve({ users: [], count: 0 }),
    canViewModeratorActions
      ? fetchManualRateLimits({ offset: 0, limit: MODERATION_PAGE_SIZE })
      : Promise.resolve({ actions: [], count: 0 }),
  ]);

  const [moderatorActionUsers, manualRateLimitUsers] = await Promise.all([
    fetchUsersByIds(
      moderatorActionsData.actions.map((action) => action.userId),
      { includeDeleted: canViewModeratorActions },
    ),
    fetchUsersByIds(
      manualRateLimitsData.actions.map((action) => action.userId),
      { includeDeleted: canViewModeratorActions },
    ),
  ]);

  const initialData: ModerationPageInitialData = {
    canViewModeratorActions,
    moderatorComments: moderatorCommentsData.comments,
    moderatorCommentsTotalCount: moderatorCommentsData.count,
    autoRateLimits: toRateLimitDisplay(autoRateLimitsData.rows),
    autoRateLimitsTotalCount: autoRateLimitsData.count,
    deletedComments: redactDeletedCommentsForViewer(
      deletedCommentsData.comments,
      canViewModeratorActions,
    ),
    deletedCommentsTotalCount: deletedCommentsData.count,
    deletedCommentPosts,
    deletedCommentDeletedByUsers,
    moderatorActions: moderatorActionsData.actions,
    moderatorActionsTotalCount: moderatorActionsData.count,
    moderatorActionUsers,
    globallyBannedUsers: globallyBannedUsersData.users,
    globallyBannedUsersTotalCount: globallyBannedUsersData.count,
    manualRateLimits: manualRateLimitsData.actions,
    manualRateLimitsTotalCount: manualRateLimitsData.count,
    manualRateLimitUsers,
  };

  return <ModerationPageContentClient initialData={initialData} />;
}
