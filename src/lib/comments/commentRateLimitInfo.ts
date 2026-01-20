import type { DbOrTransaction } from "../db";
import type { Comment, UserRateLimit } from "../schema";
import type { CurrentUser } from "../users/currentUser";
import type {
  AutoRateLimit,
  AutoRateLimitActionType,
  RateLimitFeatures,
  RateLimitType,
} from "../moderatorActions/rateLimits";
import type { PostForCommentCreation } from "./commentQueries";
import { addTime, isTimeInterval, subtractTime, TimeInterval } from "../timeUtils";
import { userIsPostAuthor } from "../users/userHelpers";
import { autoCommentRateLimits } from "../moderatorActions/rateLimits";
import { filterNonNull } from "../typeHelpers";

export type RateLimitInfo = {
  nextEligible: Date;
  rateLimitType?: RateLimitType;
  rateLimitName: string;
  rateLimitMessage: string;
};

const getCommentsOnOthersPosts = async (
  txn: DbOrTransaction,
  comments: Pick<Comment, "postId" | "postedAt">[],
  userId: string,
) => {
  // Exclude null post IDs (eg; comments on tags)
  const postIds = filterNonNull(comments.map((comment) => comment.postId));

  const postsNotAuthoredByCommenter =
    postIds.length > 0
      ? await txn.query.posts.findMany({
          columns: {
            _id: true,
            coauthorUserIds: true,
          },
          where: {
            _id: { in: postIds },
            userId: { ne: userId },
          },
        })
      : [];
  const postsNotCoauthoredByCommenter = postsNotAuthoredByCommenter.filter(
    (post) => post.coauthorUserIds.indexOf(userId) < 0,
  );
  const postsNotAuthoredByCommenterIds = postsNotCoauthoredByCommenter.map(
    (post) => post._id,
  );
  const commentsOnNonauthorPosts = comments.filter(
    (comment) =>
      comment.postId && postsNotAuthoredByCommenterIds.includes(comment.postId),
  );
  return commentsOnNonauthorPosts;
};

const getNextAbleToSubmitDate = (
  documents: { postedAt: string }[], // This could be a post or a comment, for instance
  timeframeUnit: TimeInterval,
  timeframeLength: number,
  itemsPerTimeframe: number,
): Date | null => {
  if (!isTimeInterval(timeframeUnit)) {
    return null;
  }
  const now = new Date();
  const sortedDocs = documents.sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
  );
  const timeframeStart = subtractTime(now, timeframeLength, timeframeUnit);
  const docsInTimeframe = sortedDocs.filter(
    (doc) => new Date(doc.postedAt) > timeframeStart,
  );
  const doc = docsInTimeframe[itemsPerTimeframe - 1];
  return doc
    ? addTime(new Date(doc.postedAt), timeframeLength, timeframeUnit)
    : null;
};

const getModRateLimitInfo = (
  documents: { postedAt: string }[], // This could be a post or a comment, for instance
  modRateLimitHours: number,
  itemsPerTimeframe: number,
): RateLimitInfo | null => {
  if (modRateLimitHours <= 0) {
    return null;
  }
  const nextEligible = getNextAbleToSubmitDate(
    documents,
    "hours",
    modRateLimitHours,
    itemsPerTimeframe,
  );
  if (!nextEligible) {
    return null;
  }
  return {
    nextEligible,
    rateLimitMessage: "A moderator has rate limited you.",
    rateLimitType: "moderator",
    rateLimitName: "moderatorRateLimit",
  };
};

const getModPostSpecificRateLimitInfo = (
  comments: Pick<Comment, "postId" | "postedAt">[],
  modPostSpecificRateLimitHours: number,
  postId: string | undefined,
  userIsAuthor: boolean,
): RateLimitInfo | null => {
  const eligibleForCommentOnSpecificPostRateLimit =
    modPostSpecificRateLimitHours > 0 && !userIsAuthor;
  const commentsOnPost = comments.filter((comment) => comment.postId === postId);
  return eligibleForCommentOnSpecificPostRateLimit
    ? getModRateLimitInfo(commentsOnPost, modPostSpecificRateLimitHours, 3)
    : null;
};

const getManualRateLimitInfo = (
  userRateLimit: UserRateLimit | undefined,
  documents: { postedAt: string }[],
): RateLimitInfo | null => {
  if (!userRateLimit) {
    return null;
  }
  const nextEligible = getNextAbleToSubmitDate(
    documents,
    userRateLimit.intervalUnit as TimeInterval,
    userRateLimit.intervalLength,
    userRateLimit.actionsPerInterval,
  );
  if (!nextEligible) {
    return null;
  }
  return {
    nextEligible,
    rateLimitType: "moderator",
    rateLimitMessage: "A moderator has rate limited you.",
    rateLimitName: "manualModeratorRateLimit",
  };
};

const getAutoRateLimitInfo = <ActionType extends AutoRateLimitActionType>(
  user: CurrentUser,
  features: RateLimitFeatures,
  rateLimit: AutoRateLimit<ActionType>,
  documents: { postedAt: string }[],
): RateLimitInfo | null => {
  // Rate limit effects
  const {
    timeframeUnit,
    timeframeLength,
    itemsPerTimeframe,
    rateLimitMessage,
    rateLimitType,
    rateLimitName,
  } = rateLimit;
  if (!rateLimit.isActive(user, features)) {
    return null;
  }
  const nextEligible = getNextAbleToSubmitDate(
    documents,
    timeframeUnit,
    timeframeLength,
    itemsPerTimeframe,
  );
  if (!nextEligible) {
    return null;
  }
  return { nextEligible, rateLimitType, rateLimitMessage, rateLimitName };
};

export const getCommentRateLimitInfos = async ({
  txn,
  commentsInTimeframe,
  user,
  modRateLimitHours,
  modPostSpecificRateLimitHours,
  post,
  manualCommentRateLimit,
  features,
}: {
  txn: DbOrTransaction;
  commentsInTimeframe: Pick<Comment, "postId" | "postedAt">[];
  user: CurrentUser;
  modRateLimitHours: number;
  modPostSpecificRateLimitHours: number;
  manualCommentRateLimit: UserRateLimit | undefined;
  post: PostForCommentCreation | null;
  features: RateLimitFeatures;
}): Promise<RateLimitInfo[]> => {
  const commentsOnOthersPostsInTimeframe = await getCommentsOnOthersPosts(
    txn,
    commentsInTimeframe,
    user._id,
  );

  // Deprecated! TODO: remove!  <-- This comment is from ForumMagnum
  const modGeneralRateLimitInfo = getModRateLimitInfo(
    commentsOnOthersPostsInTimeframe,
    modRateLimitHours,
    1,
  );

  const userIsAuthor = post ? userIsPostAuthor(user, post) : false;
  const modSpecificPostRateLimitInfo = getModPostSpecificRateLimitInfo(
    commentsOnOthersPostsInTimeframe,
    modPostSpecificRateLimitHours,
    post?._id,
    userIsAuthor,
  );

  const manualRateLimitInfo = userIsAuthor
    ? null
    : getManualRateLimitInfo(
        manualCommentRateLimit,
        commentsOnOthersPostsInTimeframe,
      );

  const filteredAutoRateLimits = userIsAuthor
    ? autoCommentRateLimits.filter((rateLimit) => rateLimit.appliesToOwnPosts)
    : autoCommentRateLimits;

  const autoRateLimitInfos =
    filteredAutoRateLimits?.map((rateLimit) =>
      getAutoRateLimitInfo(user, features, rateLimit, commentsInTimeframe),
    ) ?? [];

  const allRateLimits = [
    modGeneralRateLimitInfo,
    modSpecificPostRateLimitInfo,
    manualRateLimitInfo,
    ...autoRateLimitInfos,
  ];
  return filterNonNull(allRateLimits);
};
