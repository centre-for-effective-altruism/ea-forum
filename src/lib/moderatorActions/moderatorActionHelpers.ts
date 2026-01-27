export const postAndCommentRateLimits = [
  "rateLimitOnePerDay",
  "rateLimitOnePerThreeDays",
  "rateLimitOnePerWeek",
  "rateLimitOnePerFortnight",
  "rateLimitOnePerMonth",
] as const;

export type PostAndCommentRateLimit = (typeof postAndCommentRateLimits)[number];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const commentRateLimits = ["rateLimitThreeCommentsPerPost"] as const;

type CommentRateLimit = (typeof commentRateLimits)[number];

type RateLimit = PostAndCommentRateLimit | CommentRateLimit;

export type ModeratorActionType =
  | "rateLimitOnePerDay"
  | "rateLimitOnePerThreeDays"
  | "rateLimitOnePerWeek"
  | "rateLimitOnePerFortnight"
  | "rateLimitOnePerMonth"
  | "rateLimitThreeCommentsPerPost"
  | "recentlyDownvotedContentAlert"
  | "lowAverageKarmaCommentAlert"
  | "lowAverageKarmaPostAlert"
  | "negativeUserKarmaAlert"
  | "movedPostToDraft"
  | "sentModeratorMessage"
  | "manualFlag"
  | "votingPatternWarningDelivered"
  | "flaggedForNDMs"
  | "autoBlockedFromSendingDMs"
  | "rejectedPost"
  | "rejectedComment"
  | "potentialTargetedDownvoting"
  | "exemptFromRateLimits"
  | "receivedSeniorDownvotesAlert";

/**
 * Helper function to ensure at the type level that moderator action type strings
 * are valid
 */
export const moderatorActionType = (
  type: ModeratorActionType,
): ModeratorActionType => type;

/**
 * For a given RateLimitType, returns the number of hours a user has to wait before posting again.
 */
export function getTimeframeForRateLimit(type: RateLimit): number {
  switch (type) {
    case "rateLimitOnePerDay":
      return 24;
    case "rateLimitOnePerThreeDays":
      return 24 * 3;
    case "rateLimitOnePerWeek":
      return 24 * 7;
    case "rateLimitOnePerFortnight":
      return 24 * 14;
    case "rateLimitOnePerMonth":
      return 24 * 30;
    case "rateLimitThreeCommentsPerPost":
      return 24 * 7;
    default:
      return 0;
  }
}
