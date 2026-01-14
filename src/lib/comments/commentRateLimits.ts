import type { UserRateLimit } from "../schema";
import type { CurrentUser } from "../users/currentUser";
import type { DbOrTransaction } from "../db";
import type { PostForCommentCreation } from "./commentQueries";
import type { UserRateLimitType } from "../userRateLimits/userRateLimitHelpers";
import { isNotTrue } from "../utils/queryHelpers";
import { intervalToHours, isTimeInterval, nHoursAgo } from "../timeUtils";
import { userIsAdmin, userIsInGroup } from "../users/userHelpers";
import { getModeratorRateLimit } from "../moderatorActions/moderatorActionQueries";
import { getRecentKarmaInfo } from "../votes/recentKarmaInfo";
import { getCommentRateLimitInfos, RateLimitInfo } from "./commentRateLimitInfo";
import {
  autoCommentRateLimits,
  AutoRateLimit,
  AutoRateLimitActionType,
} from "../moderatorActions/rateLimits";
import {
  getTimeframeForRateLimit,
  ModeratorActionType,
  moderatorActionType,
} from "../moderatorActions/moderatorActionHelpers";

// TODO: All this stuff is a buggy mess in ForumMagnum - write some tests.

/**
 * Checks if the user is exempt from commenting rate limits (optionally, for the
 * given post).
 * Admins and mods are always exempt.
 * If the post has "ignoreRateLimits" set, then all users are exempt.
 */
const shouldIgnoreCommentRateLimit = async (
  txn: DbOrTransaction,
  user: CurrentUser,
  post: PostForCommentCreation | null,
): Promise<boolean> => {
  if (
    userIsAdmin(user) ||
    userIsInGroup(user, "sunshineRegiment") ||
    post?.ignoreRateLimits
  ) {
    return true;
  }
  const rateLimitExemptAction = await txn.query.moderatorActions.findFirst({
    where: {
      userId: user._id,
      type: moderatorActionType("exemptFromRateLimits"),
      endedAt: { gt: new Date().toISOString() },
    },
  });
  return !!rateLimitExemptAction;
};

const getModRateLimitHours = async (
  txn: DbOrTransaction,
  userId: string,
): Promise<number> => {
  const moderatorRateLimit = await getModeratorRateLimit(txn, userId);
  return moderatorRateLimit ? getTimeframeForRateLimit(moderatorRateLimit.type) : 0;
};

const userHasActiveModeratorActionOfType = async (
  txn: DbOrTransaction,
  userId: string,
  moderatorActionType: ModeratorActionType,
): Promise<boolean> => {
  const action = await txn.query.moderatorActions.findFirst({
    where: {
      userId: userId,
      type: moderatorActionType,
      OR: [
        { endedAt: { isNull: true } },
        { endedAt: { gt: new Date().toISOString() } },
      ],
    },
  });
  return !!action;
};

const getModPostSpecificRateLimitHours = async (
  txn: DbOrTransaction,
  userId: string,
): Promise<number> => {
  const hasPostSpecificRateLimit = await userHasActiveModeratorActionOfType(
    txn,
    userId,
    "rateLimitThreeCommentsPerPost",
  );
  return hasPostSpecificRateLimit
    ? getTimeframeForRateLimit("rateLimitThreeCommentsPerPost")
    : 0;
};

const getManualRateLimit = (
  txn: DbOrTransaction,
  userId: string,
  type: UserRateLimitType,
) =>
  txn.query.userRateLimits.findFirst({
    where: {
      userId,
      type,
      OR: [
        { endedAt: { isNull: true } },
        { endedAt: { gt: new Date().toISOString() } },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

const getManualRateLimitIntervalHours = (
  userRateLimit?: UserRateLimit | null,
): number => {
  if (!userRateLimit) {
    return 0;
  }
  return isTimeInterval(userRateLimit.intervalUnit)
    ? intervalToHours(userRateLimit.intervalLength, userRateLimit.intervalUnit)
    : 0;
};

const getMaxAutoLimitHours = <ActionType extends AutoRateLimitActionType>(
  rateLimits?: AutoRateLimit<ActionType>[],
) => {
  if (!rateLimits) {
    return 0;
  }
  return Math.max(
    ...rateLimits.map(({ timeframeLength, timeframeUnit }) =>
      intervalToHours(timeframeLength, timeframeUnit),
    ),
  );
};

const getCommentsInTimeframe = (
  txn: DbOrTransaction,
  userId: string,
  maxTimeframe: number,
) =>
  txn.query.comments.findMany({
    columns: {
      postId: true,
      postedAt: true,
    },
    where: {
      userId,
      draft: false,
      debateResponse: isNotTrue,
      postedAt: { gte: nHoursAgo(maxTimeframe).toISOString() },
    },
    orderBy: {
      postedAt: "desc",
    },
  });

const getUserVotesReceived = (txn: DbOrTransaction, userId: string) =>
  txn.query.users.findFirst({
    columns: {
      smallUpvoteReceivedCount: true,
      bigUpvoteReceivedCount: true,
      smallDownvoteReceivedCount: true,
      bigDownvoteReceivedCount: true,
      voteReceivedCount: true,
    },
    where: {
      _id: userId,
    },
  });

type UserVotesReceived = NonNullable<
  Awaited<ReturnType<typeof getUserVotesReceived>>
>;

const getDownvoteRatio = (user?: UserVotesReceived): number => {
  // First check if the sum of the individual vote count fields
  // add up to something close (with 5%) to the voteReceivedCount field.
  // (They should be equal, but we know there are bugs around counting votes,
  // so to be fair to users we don't want to rate limit them if it's too buggy.)
  let {
    smallUpvoteReceivedCount,
    bigUpvoteReceivedCount,
    smallDownvoteReceivedCount,
    bigDownvoteReceivedCount,
    voteReceivedCount,
  } = user ?? {};

  smallUpvoteReceivedCount ??= 0;
  bigUpvoteReceivedCount ??= 0;
  smallDownvoteReceivedCount ??= 0;
  bigDownvoteReceivedCount ??= 0;
  voteReceivedCount ??= 0;

  const sumOfVoteCounts =
    smallUpvoteReceivedCount +
    bigUpvoteReceivedCount +
    smallDownvoteReceivedCount +
    bigDownvoteReceivedCount;
  const denormalizedVoteCountSumDiff = Math.abs(sumOfVoteCounts - voteReceivedCount);
  const voteCountsAreValid =
    voteReceivedCount > 0 &&
    denormalizedVoteCountSumDiff / voteReceivedCount <= 0.05;

  const totalDownvoteCount = smallDownvoteReceivedCount + bigDownvoteReceivedCount;
  // If vote counts are not valid (i.e. they are negative or voteReceivedCount is 0), then do nothing
  return voteCountsAreValid ? totalDownvoteCount / voteReceivedCount : 0;
};

const getStrictestRateLimitInfo = (
  rateLimits: RateLimitInfo[],
): RateLimitInfo | null => {
  const sortedRateLimits = rateLimits.sort(
    (a, b) => b.nextEligible.getTime() - a.nextEligible.getTime(),
  );
  return sortedRateLimits[0] ?? null;
};

export const rateLimitDateWhenUserNextAbleToComment = async (
  txn: DbOrTransaction,
  user: CurrentUser,
  post: PostForCommentCreation | null,
): Promise<RateLimitInfo | null> => {
  const ignoreRateLimits = await shouldIgnoreCommentRateLimit(txn, user, post);
  if (ignoreRateLimits) {
    return null;
  }

  // Does the user have a moderator-assigned rate limit?
  // Also get the recent karma info, we'll need it later
  const [
    modRateLimitHours,
    modPostSpecificRateLimitHours,
    manualCommentRateLimit,
    recentKarmaInfo,
  ] = await Promise.all([
    getModRateLimitHours(txn, user._id),
    getModPostSpecificRateLimitHours(txn, user._id),
    getManualRateLimit(txn, user._id, "allComments"),
    getRecentKarmaInfo(txn, user._id),
  ]);

  const manualCommentRateLimitHours = getManualRateLimitIntervalHours(
    manualCommentRateLimit,
  );

  // What's the longest rate limit timeframe being evaluated?
  const maxCommentAutolimitHours = getMaxAutoLimitHours(autoCommentRateLimits);
  const maxHours = Math.max(
    modRateLimitHours,
    modPostSpecificRateLimitHours,
    maxCommentAutolimitHours,
    manualCommentRateLimitHours,
  );

  // Fetch the comments from within the maxTimeframe
  const [commentsInTimeframe, userVotesReceived] = await Promise.all([
    getCommentsInTimeframe(txn, user._id, maxHours),
    getUserVotesReceived(txn, user._id),
  ]);

  const features = {
    ...recentKarmaInfo,
    downvoteRatio: getDownvoteRatio(userVotesReceived),
  };

  const rateLimitInfos = await getCommentRateLimitInfos({
    txn,
    commentsInTimeframe,
    user,
    modRateLimitHours,
    modPostSpecificRateLimitHours,
    post,
    manualCommentRateLimit,
    features,
  });

  return getStrictestRateLimitInfo(rateLimitInfos);
};
