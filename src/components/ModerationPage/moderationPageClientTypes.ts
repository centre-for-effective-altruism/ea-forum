import type { CommentsList } from "@/lib/comments/commentLists";
import type {
  AutoRateLimitRow,
  DeletedCommentRow,
  GloballyBannedUserRow,
  LinkableUser,
  ModeratorActionRow,
  PostSummary,
} from "@/lib/moderation/moderationTypes";

export type SectionState = {
  loading: boolean;
  error: string | null;
};

export type ModerationPagePaginationState = {
  moderatorComments: number;
  autoRateLimits: number;
  deletedComments: number;
  moderatorActions: number;
  globallyBannedUsers: number;
  manualRateLimits: number;
};

export type ModerationRowsState<T> = SectionState & {
  rows: T[];
  totalCount: number;
};

export type DeletedCommentsSectionState = ModerationRowsState<DeletedCommentRow> & {
  postMap: Record<string, PostSummary>;
  deletedByUsersMap: Record<string, LinkableUser>;
};

export type UserMappedRowsState<T> = ModerationRowsState<T> & {
  usersMap: Record<string, LinkableUser>;
};

export type ModerationPageInitialData = {
  canViewModeratorActions: boolean;
  moderatorComments: CommentsList[];
  moderatorCommentsTotalCount: number;
  autoRateLimits: AutoRateLimitRow[];
  autoRateLimitsTotalCount: number;
  deletedComments: DeletedCommentRow[];
  deletedCommentsTotalCount: number;
  deletedCommentPosts: Record<string, PostSummary>;
  deletedCommentDeletedByUsers: Record<string, LinkableUser>;
  moderatorActions: ModeratorActionRow[];
  moderatorActionsTotalCount: number;
  moderatorActionUsers: Record<string, LinkableUser>;
  globallyBannedUsers: GloballyBannedUserRow[];
  globallyBannedUsersTotalCount: number;
  manualRateLimits: ModeratorActionRow[];
  manualRateLimitsTotalCount: number;
  manualRateLimitUsers: Record<string, LinkableUser>;
};
