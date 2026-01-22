import type { DbOrTransaction } from "../db";
import { nMonthsAgo } from "../timeUtils";
import { getVotesOnRecentContent, RecentVoteInfo } from "./recentVoteInfo";
import uniq from "lodash/uniq";

export type RecentKarmaInfo = {
  last20Karma: number;
  lastMonthKarma: number;
  last20PostKarma: number;
  last20CommentKarma: number;
  downvoterCount: number;
  postDownvoterCount: number;
  commentDownvoterCount: number;
  lastMonthDownvoterCount: number;
};

const getVotesOnLatestDocuments = (
  votes: RecentVoteInfo[],
  numItems = 20,
): RecentVoteInfo[] => {
  // Sort the votes via the date *postedAt*
  const sortedVotes = votes.sort(
    (a, b) => b.postedAt.getTime() - a.postedAt.getTime(),
  );

  const uniqueDocumentIds = uniq(sortedVotes.map((vote) => vote.documentId));
  const latestDocumentIds = new Set(uniqueDocumentIds.slice(0, numItems));

  // Get all votes whose documentId is in the top 20 most recent documents
  return sortedVotes.filter((vote) => latestDocumentIds.has(vote.documentId));
};

const getDownvoterCount = (votes: RecentVoteInfo[]) => {
  const downvoters = votes
    .filter((vote: RecentVoteInfo) => vote.power < 0 && vote.totalDocumentKarma <= 0)
    .map((vote: RecentVoteInfo) => vote.userId);
  return uniq(downvoters).length;
};

export const calculateRecentKarmaInfo = (
  userId: string,
  allVotes: RecentVoteInfo[],
): RecentKarmaInfo => {
  const top20DocumentVotes = getVotesOnLatestDocuments(allVotes);

  // We filter out the user's self-upvotes here, rather than in the query, because
  // otherwise the getLatest20contentItems won't know about all the relevant
  // posts and comments. i.e. if a user comments 20 times, and nobody upvotes them,
  // we wouldn't know to include them in the sorted list (the alternative here
  // would be making an additional query for all posts/comments, regardless of
  // who voted on them, which seemed at least as expensive as filtering out the
  // self-votes here)
  const nonuserIDallVotes = allVotes.filter(
    (vote: RecentVoteInfo) => vote.userId !== userId,
  );
  const nonUserIdTop20DocVotes = top20DocumentVotes.filter(
    (vote: RecentVoteInfo) => vote.userId !== userId,
  );
  const postVotes = nonuserIDallVotes.filter(
    (vote) => vote.collectionName === "Posts",
  );
  const commentVotes = nonuserIDallVotes.filter(
    (vote) => vote.collectionName === "Comments",
  );

  const oneMonthAgo = nMonthsAgo(1);
  const lastMonthVotes = nonUserIdTop20DocVotes.filter(
    (vote) => vote.postedAt > oneMonthAgo,
  );
  const lastMonthKarma = lastMonthVotes.reduce(
    (sum: number, vote: RecentVoteInfo) => sum + vote.power,
    0,
  );

  const last20Karma = nonUserIdTop20DocVotes.reduce(
    (sum: number, vote: RecentVoteInfo) => sum + vote.power,
    0,
  );
  const last20PostKarma = postVotes.reduce(
    (sum: number, vote: RecentVoteInfo) => sum + vote.power,
    0,
  );
  const last20CommentKarma = commentVotes.reduce(
    (sum: number, vote: RecentVoteInfo) => sum + vote.power,
    0,
  );

  const downvoterCount = getDownvoterCount(nonUserIdTop20DocVotes);
  const commentDownvoterCount = getDownvoterCount(commentVotes);
  const postDownvoterCount = getDownvoterCount(postVotes);
  const lastMonthDownvoterCount = getDownvoterCount(lastMonthVotes);

  return {
    last20Karma,
    lastMonthKarma,
    last20PostKarma,
    last20CommentKarma,
    downvoterCount: downvoterCount ?? 0,
    postDownvoterCount: postDownvoterCount ?? 0,
    commentDownvoterCount: commentDownvoterCount ?? 0,
    lastMonthDownvoterCount: lastMonthDownvoterCount ?? 0,
  };
};

export const getRecentKarmaInfo = async (
  txn: DbOrTransaction,
  userId: string,
): Promise<RecentKarmaInfo> => {
  const allVotes = await getVotesOnRecentContent(txn, userId);
  return calculateRecentKarmaInfo(userId, allVotes);
};
