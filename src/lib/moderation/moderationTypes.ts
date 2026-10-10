export type UserSummary = {
  _id: string;
  slug: string | null;
  displayName: string | null;
  deleted?: boolean | null;
};

export type PostSummary = {
  _id: string;
  slug: string | null;
  title: string | null;
  isEvent: boolean | null;
  groupId: string | null;
};

export type RateLimitEntry = {
  actionType: string;
  rateLimitType: string;
  rateLimitCategory: "static" | "rolling" | "timed";
  itemsPerTimeframe: number;
  timeframeLength: number;
  timeframeUnit: string;
  rateLimitMessage: string;
  activatedAt: Date;
};

export type RateLimitRow = {
  userId: string;
  rateLimits: unknown;
  mostRecentActivation: Date;
  user__id: string | null;
  user_displayName: string | null;
  user_slug: string | null;
  user_deleted: boolean | null;
  user_createdAt: Date | null;
  user_karma: number | null;
  user_postCount: number | null;
  user_commentCount: number | null;
};

export type AutoRateLimitRow = {
  userId: string;
  mostRecentActivation: Date;
  rateLimits: RateLimitEntry[];
  user:
    | (UserSummary & {
        createdAt: Date | null;
        karma: number | null;
        postCount: number | null;
        commentCount: number | null;
      })
    | null;
};

export type DeletedCommentRow = {
  _id: string;
  postId: string | null;
  deletedDate?: Date | string | null;
  deletedReason?: string | null;
  deletedByUserId?: string | null;
  user?: UserSummary | null;
};

export type ModeratorActionRow = {
  _id: string;
  userId: string;
  type: string;
  endedAt: Date | string | null;
};

export type GloballyBannedUserRow = UserSummary & {
  karma: number | null;
  postCount: number | null;
  commentCount: number | null;
  createdAt: Date | string | null;
  banned: Date | string | null;
};
