import type {
  AutoRateLimitRow,
  RateLimitEntry,
  RateLimitRow,
} from "./moderationTypes";

export const MODERATION_PAGE_SIZE = 20;
export const MODERATOR_COMMENTS_PAGE_SIZE = 10;

export const uniqueIds = (values: Array<string | null | undefined>) => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
];

export const parseRateLimits = (value: unknown): RateLimitEntry[] => {
  if (Array.isArray(value)) {
    return value as RateLimitEntry[];
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as RateLimitEntry[];
    } catch {
      return [];
    }
  }
  return [];
};

export const toRateLimitDisplay = (rows: RateLimitRow[]): AutoRateLimitRow[] =>
  rows.map((row) => ({
    userId: row.userId,
    mostRecentActivation: row.mostRecentActivation,
    rateLimits: parseRateLimits(row.rateLimits),
    user: row.user__id
      ? {
          _id: row.user__id,
          displayName: row.user_displayName ?? null,
          slug: row.user_slug ?? null,
          deleted: row.user_deleted ?? null,
          createdAt: row.user_createdAt ?? null,
          karma: row.user_karma ?? null,
          postCount: row.user_postCount ?? null,
          commentCount: row.user_commentCount ?? null,
        }
      : null,
  }));
