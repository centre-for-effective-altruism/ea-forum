import type { CurrentUser } from "../users/currentUser";
import { db } from "../db";
import { fetchPostsListByIds } from "../posts/postLists";
import { fetchCommentsListByIds } from "../comments/commentLists";

/**
 * Returns the documents the user has voted on, most recent first. Every vote
 * is included (with a null document if it's no longer viewable) so that
 * offsets stay aligned with the underlying votes when paginating.
 */
export const fetchVoteHistory = async ({
  currentUser,
  offset,
  limit,
}: {
  currentUser: CurrentUser;
  offset?: number;
  limit?: number;
}) => {
  const userVotes = await db.query.votes.findMany({
    columns: {
      _id: true,
      documentId: true,
      collectionName: true,
      votedAt: true,
    },
    where: {
      userId: currentUser._id,
      collectionName: { in: ["Posts", "Comments"] },
      cancelled: false,
      isUnvote: false,
      // Only include neutral votes that have extended vote data
      OR: [
        { voteType: { ne: "neutral" } },
        { extendedVoteType: { isNotNull: true } },
      ],
      RAW: (votesTable, { sql }) =>
        sql`NOT COALESCE(${votesTable.authorIds} @> ARRAY[${currentUser._id}]::VARCHAR[], FALSE)`,
    },
    orderBy: {
      votedAt: "desc",
      _id: "asc",
    },
    offset,
    limit,
  });
  const idsFor = (collectionName: string) =>
    userVotes
      .filter((vote) => vote.collectionName === collectionName)
      .map(({ documentId }) => documentId);
  const [posts, comments] = await Promise.all([
    fetchPostsListByIds(currentUser._id, idsFor("Posts")),
    fetchCommentsListByIds({ currentUser, commentIds: idsFor("Comments") }),
  ]);
  return userVotes.map(({ _id, documentId, collectionName, votedAt }) => ({
    _id,
    votedAt,
    post:
      collectionName === "Posts"
        ? (posts.find((post) => post._id === documentId) ?? null)
        : null,
    comment:
      collectionName === "Comments"
        ? (comments.find((comment) => comment._id === documentId) ?? null)
        : null,
  }));
};

export type VoteHistoryItem = Awaited<ReturnType<typeof fetchVoteHistory>>[number];
