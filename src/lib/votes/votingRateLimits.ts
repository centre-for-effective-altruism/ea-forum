import { sql, and, eq, ne } from "drizzle-orm";
import { db } from "../db";
import { comments, Vote, votes } from "../schema";
import { userIsAdmin } from "../users/userHelpers";
import { nDaysAgo } from "../timeUtils";
import type { ModeratorActionType } from "../moderatorActions/moderatorActionHelpers";
import type { CurrentUser } from "../users/currentUser";
import type { VoteableDocument } from "./voteableDocument";
import type { VoteType } from "./voteHelpers";

type Consequence = "warningPopup" | "denyThisVote" | "flagForModeration";

type VotingRateLimit = {
  voteCount: number | ((postCommentCount: number | null) => number);
  /**
   * If provided, periodInMinutes must be ≤ than 24 hours. At least one of
   * periodInMinutes or allOnSamePost must be provided.
   */
  periodInMinutes: number | null;
  allOnSamePost?: true;
  types: "all" | "onlyStrong" | "onlyDown";
  users: "allUsers" | "singleUser";
  consequences: Consequence[];
  message: string | null;
};

const defaultVotingRateLimits: VotingRateLimit[] = [
  {
    voteCount: 200,
    periodInMinutes: 60 * 24,
    types: "all",
    users: "allUsers",
    consequences: ["denyThisVote"],
    message: "too many votes in one day",
  },
  {
    voteCount: 100,
    periodInMinutes: 60,
    types: "all",
    users: "allUsers",
    consequences: ["denyThisVote"],
    message: "too many votes in one hour",
  },
  {
    voteCount: 100,
    periodInMinutes: 24 * 60,
    types: "all",
    users: "singleUser",
    consequences: ["denyThisVote"],
    message: "too many votes today on content by this author",
  },
  {
    voteCount: 9,
    periodInMinutes: 2,
    types: "onlyDown",
    users: "singleUser",
    consequences: ["flagForModeration"],
    message: "too many votes in short succession on content by this author",
  },
  {
    voteCount: 10,
    periodInMinutes: 3,
    types: "all",
    users: "singleUser",
    consequences: ["warningPopup"],
    message: null,
  },
  {
    voteCount: 10,
    periodInMinutes: 60,
    types: "onlyStrong",
    users: "allUsers",
    consequences: ["denyThisVote"],
    message: "too many strong-votes in one hour",
  },
  {
    voteCount: (postCommentCount: number | null) =>
      5 + Math.round((postCommentCount ?? 0) * 0.05),
    periodInMinutes: null,
    allOnSamePost: true,
    types: "onlyStrong",
    users: "allUsers",
    consequences: ["denyThisVote"],
    message: "You can only strong-vote on up to (5+5%) of the comments on a post",
  },
];

const getVotingRateLimits = (user: CurrentUser): VotingRateLimit[] =>
  userIsAdmin(user) ? [] : defaultVotingRateLimits;

const voteTypeIsStrong = (voteType: string) => voteType.startsWith("big");

const voteTypeIsDown = (voteType: string) => voteType.includes("Downvote");

const getRelevantVotes = <
  V extends Pick<Vote, "voteType" | "authorIds" | "votedAt">,
>(
  rateLimit: VotingRateLimit,
  document: VoteableDocument,
  votes: V[],
): V[] => {
  const now = new Date().getTime();
  return votes.filter((vote) => {
    const ageInMS = now - new Date(vote.votedAt).getTime();
    const ageInMinutes = ageInMS / (1000 * 60);

    if (rateLimit.periodInMinutes && ageInMinutes > rateLimit.periodInMinutes) {
      return false;
    }

    if (
      rateLimit.users === "singleUser" &&
      !!document.userId &&
      !vote.authorIds?.includes(document.userId)
    ) {
      return false;
    }

    const isStrong = voteTypeIsStrong(vote.voteType);
    const isDown = voteTypeIsDown(vote.voteType);
    if (rateLimit.types === "onlyStrong" && !isStrong) {
      return false;
    }
    if (rateLimit.types === "onlyDown" && !isDown) {
      return false;
    }
    return true;
  });
};

export const checkVotingRateLimits = async (
  document: VoteableDocument,
  user: CurrentUser,
  voteType: VoteType,
): Promise<{
  moderatorActionType?: ModeratorActionType;
}> => {
  // No rate limit on self-votes
  if (document.userId === user._id) {
    return {};
  }

  // Get rate limits for this user
  const rateLimits = getVotingRateLimits(user);
  if (!rateLimits.length) {
    return {};
  }

  // Retrieve all non-cancelled votes cast by this user that were either cast
  // in the past 24 hours, or are on comments on the same post as this one
  const oneDayAgo = nDaysAgo(1).toISOString();
  const postId = "postId" in document ? (document.postId ?? null) : null;
  const [votesInLastDay, votesOnCommentsOnThisPost, postWithCommentCount] =
    await Promise.all([
      // Votes on any document by this user in the last day
      db.query.votes.findMany({
        columns: {
          voteType: true,
          votedAt: true,
          authorIds: true,
        },
        where: {
          userId: user._id,
          votedAt: { gt: oneDayAgo },
          cancelled: false,
          RAW: sql`${user._id} <> ANY(${votes.authorIds})`, // Self-votes don't count
        },
      }),
      // Votes on comments on this post by this user at any time in the past
      postId
        ? db
            .select({
              voteType: votes.voteType,
              votedAt: votes.votedAt,
              authorIds: votes.authorIds,
            })
            .from(votes)
            .innerJoin(
              comments,
              and(eq(comments._id, votes.documentId), eq(comments.postId, postId)),
            )
            .where(
              and(
                eq(votes.cancelled, false),
                eq(votes.userId, user._id),
                ne(votes.documentId, document._id),
                eq(votes.collectionName, "Comments"),
              ),
            )
        : [],
      // The comment count of the post, if the voted document is a comment
      postId
        ? db.query.posts.findFirst({
            columns: { commentCount: true },
            where: { _id: postId },
          })
        : null,
    ]);

  // If this is a vote on a comment on a post, get the comment-count of that
  // post to use for percentage-based rate limits.
  const postCommentCount = postWithCommentCount?.commentCount ?? null;

  // Go through rate limits checking if each applies. If more than one rate
  // limit applies, we take the union of the consequences of exceeding all of
  // them, and use the message from whichever was first in the list.
  let firstExceededRateLimit: VotingRateLimit | null = null;
  const rateLimitConsequences = new Set<Consequence>();

  for (const rateLimit of rateLimits) {
    const votesToConsider = rateLimit.allOnSamePost
      ? votesOnCommentsOnThisPost
      : votesInLastDay;
    const limitVoteCount =
      typeof rateLimit.voteCount === "function"
        ? rateLimit.voteCount(postCommentCount)
        : rateLimit.voteCount;
    if (votesToConsider.length < limitVoteCount) {
      continue;
    }
    if (rateLimit.types === "onlyDown" && !voteTypeIsDown(voteType)) {
      continue;
    }
    if (rateLimit.types === "onlyStrong" && !voteTypeIsStrong(voteType)) {
      continue;
    }

    const relevantVotes = getRelevantVotes(rateLimit, document, votesToConsider);
    if (relevantVotes.length >= limitVoteCount) {
      if (!firstExceededRateLimit) {
        firstExceededRateLimit = rateLimit;
      }
      for (const consequence of rateLimit.consequences) {
        rateLimitConsequences.add(consequence);
      }
    }
  }

  // Was any rate limit exceeded?
  let moderatorActionType: ModeratorActionType | undefined = undefined;
  if (firstExceededRateLimit) {
    if (rateLimitConsequences.has("warningPopup")) {
      moderatorActionType = "votingPatternWarningDelivered";
    }
    if (rateLimitConsequences.has("denyThisVote")) {
      const message = firstExceededRateLimit.message;
      if (message) {
        throw new Error(`Voting rate limit exceeded: ${message}`);
      } else {
        throw new Error("Voting rate limit exceeded");
      }
    }
    if (rateLimitConsequences.has("flagForModeration")) {
      moderatorActionType = "potentialTargetedDownvoting";
    }
  }
  return { moderatorActionType };
};

export const wasVotingPatternWarningDeliveredRecently = async (
  user: CurrentUser,
  moderatorActionType: ModeratorActionType,
): Promise<boolean> => {
  const mostRecentWarning = await db.query.moderatorActions.findFirst({
    columns: {
      createdAt: true,
    },
    where: {
      userId: user._id,
      type: moderatorActionType,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  if (!mostRecentWarning?.createdAt) {
    return false;
  }
  const createdAt = new Date(mostRecentWarning.createdAt);
  const warningAgeMS = new Date().getTime() - createdAt.getTime();
  const warningAgeMinutes = warningAgeMS / (1000 * 60);
  return warningAgeMinutes < 60;
};
