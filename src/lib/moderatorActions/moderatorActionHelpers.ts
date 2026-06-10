import type { ModeratorAction } from "../schema";

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

export const MODERATOR_ACTION_TYPES: Record<ModeratorActionType, string> = {
  rateLimitOnePerDay: "Rate Limit (1 per day)",
  rateLimitOnePerThreeDays: "Rate Limit (1 per 3 days)",
  rateLimitOnePerWeek: "Rate Limit (1 per week)",
  rateLimitOnePerFortnight: "Rate Limit (1 per fortnight)",
  rateLimitOnePerMonth: "Rate Limit (1 per month)",
  rateLimitThreeCommentsPerPost: "Rate Limit (3 comments per post per week)",
  recentlyDownvotedContentAlert: "Recently Downvoted Content",
  lowAverageKarmaCommentAlert: "Low Average Karma Comments",
  lowAverageKarmaPostAlert: "Low Average Karma Posts",
  negativeUserKarmaAlert: "Negative Karma User",
  movedPostToDraft: "Moved Post to Draft",
  sentModeratorMessage: "Sent Moderator Message",
  manualFlag: "Manually Flagged",
  votingPatternWarningDelivered: "Received automatic warning for voting too fast",
  flaggedForNDMs: "Auto-flagged for sending suspiciously many DMs",
  autoBlockedFromSendingDMs:
    "Auto-blocked from sending DMs for trying to send suspiciously many DMs",
  rejectedPost: "Rejected Post",
  rejectedComment: "Rejected Comment",
  potentialTargetedDownvoting: "Suspected targeted downvoting of a specific user",
  exemptFromRateLimits: "Exempt from rate limits",
  receivedSeniorDownvotesAlert:
    "Received too many downvotes on net-negative comments from senior users; if justified, default to 1 comment per 2 day rate limit for a month",
};

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

/**
 * If the action hasn't ended yet (either no endedAt, or endedAt in the future) then
 * it's active.
 */
export const isActionActive = (moderatorAction: Pick<ModeratorAction, "endedAt">) =>
  !moderatorAction.endedAt || new Date(moderatorAction.endedAt) > new Date();
