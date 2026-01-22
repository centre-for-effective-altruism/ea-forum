"use server";

import type { VoteType } from "../votes/voteHelpers";
import { db } from "../db";
import { getCurrentUser } from "../users/currentUser";
import { performVote } from "../votes/voteMutations";
import {
  getVoteableDocument,
  VoteableCollectionName,
} from "../votes/voteableDocument";

export const onVoteAction = async (
  collectionName: VoteableCollectionName,
  documentId: string,
  voteType: VoteType,
  extendedVote?: Record<string, string>,
) => {
  const [user, document] = await Promise.all([
    getCurrentUser(),
    getVoteableDocument(collectionName, documentId),
  ]);
  if (!user) {
    throw new Error("Not logged in");
  }
  if (!document) {
    throw new Error("Document not found");
  }
  return await db.transaction((txn) =>
    performVote({
      txn,
      collectionName,
      document,
      user,
      voteType,
      extendedVote,
    }),
  );
};
