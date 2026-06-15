import type { DbOrTransaction } from "../db";
import type { Revision } from "../schema";
import { currentUserProjection } from "../users/currentUser";
import { performVote } from "../votes/voteMutations";

export const upvoteOwnTagRevision = async (
  txn: DbOrTransaction,
  revision: Revision,
) => {
  if (
    revision.collectionName !== "Tags" ||
    !revision.userId ||
    !revision.documentId
  ) {
    return;
  }

  const user = await txn.query.users.findFirst({
    ...currentUserProjection,
    where: {
      _id: revision.userId,
    },
  });
  if (!user) {
    return;
  }

  await performVote({
    txn,
    collectionName: "Revisions",
    document: revision,
    user,
    voteType: "smallUpvote",
    skipRateLimits: true,
  });
};
