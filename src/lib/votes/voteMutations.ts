import maxBy from "lodash/maxBy";
import { and, eq } from "drizzle-orm";
import { randomId } from "@/lib/utils/random";
import { db, Transaction } from "../db";
import { votes, Comment, Revision } from "../schema";
import { collectionIsSearchIndexed } from "../search/elastic/elasticIndexes";
import { elasticSyncDocument } from "../search/elastic/elasticSync";
import type { CurrentUser } from "../users/currentUser";
import { userCanDo } from "../users/userHelpers";
import { createModeratorAction } from "../moderatorActions/moderatorActionMutations";
import { calculateVotePower, VoteType } from "./voteHelpers";
import {
  checkVotingRateLimits,
  wasVotingPatternWarningDeliveredRecently,
} from "./votingRateLimits";
import {
  fetchVoteableDocumentAuthors,
  recalculateDocumentScores,
  VoteableCollectionName,
  VoteableDocument,
  VoteableDocumentAuthor,
  VoteableSchema,
  voteableSchemas,
} from "./voteableDocument";
import {
  increasePostMaxBaseScore,
  updateUserVoteCounts,
  updateUserKarma,
  triggerCommentAutomod,
} from "./voteCallbacks";

const clearVotes = async ({
  collectionName,
  schema,
  document,
  authors,
  user,
  excludeLatest,
  silenceNotification,
  txn,
}: {
  collectionName: VoteableCollectionName;
  schema: VoteableSchema;
  document: VoteableDocument;
  authors: VoteableDocumentAuthor[];
  user: CurrentUser;
  /**
   * If true, clears all votes except the latest (ie, only clears duplicate
   * votes). If false, clears all votes (including the latest).
   */
  excludeLatest?: boolean;
  /**
   * If true, notifies the user of the karma changes from this vote. This will
   * be true except for votes being nullified by mods.
   */
  silenceNotification?: boolean;
  txn: Transaction;
}): Promise<VoteableDocument> => {
  const allVotes = await txn.query.votes.findMany({
    columns: {
      _id: true,
      votedAt: true,
    },
    where: {
      documentId: document._id,
      userId: user._id,
      cancelled: false,
    },
  });
  if (!allVotes.length) {
    return document;
  }

  const latestVoteId = maxBy(allVotes, (v) => v.votedAt)?._id;
  const votesToCancel = excludeLatest
    ? allVotes.filter((v) => v._id !== latestVoteId)
    : allVotes;

  // Mark the votes as cancelled in the DB one at a time. If any of
  // these doesn't return a result, it means `cancelled` was set to true in a
  // concurrent operation, and that other operation is the one responsible for
  // running the vote-canceled callbacks (which do the user-karma updates).
  // If this was done the more straightforward way, then hitting vote buttons
  // quickly could lead to votes getting double-cancelled; this doesn't affect
  // the score of the document (which is recomputed from scratch each time) but
  // does affect the user's karma. We used to have a bug like that.
  const voteCancellations = await Promise.all(
    votesToCancel.map((vote) =>
      txn
        .update(votes)
        .set({ cancelled: true })
        .where(and(eq(votes._id, vote._id), eq(votes.cancelled, false)))
        .returning(),
    ),
  );
  for (const voteCancellation of voteCancellations) {
    const vote = voteCancellation[0];
    if (!vote) {
      continue;
    }
    // Create an un-vote for each of the existing votes
    await txn.insert(votes).values({
      ...vote,
      _id: randomId(),
      cancelled: true,
      isUnvote: true,
      power: -vote.power,
      votedAt: new Date().toISOString(),
      silenceNotification,
    });
    await Promise.all([
      updateUserKarma(txn, collectionName, authors, user._id, -vote.power),
      updateUserVoteCounts(txn, authors, user._id, vote.voteType as VoteType, -1),
      // TODO: We still need the following ForumMagnum vote callbacks
      // voteUpdatePostDenormalizedTags
      // recomputeContributorScoresFor
    ]);
  }

  const updatedScores = await recalculateDocumentScores(document, txn);
  await txn
    .update(schema)
    .set({
      ...("inactive" in schema ? { inactive: false } : null),
      ...updatedScores,
    })
    .where(eq(schema._id, document._id));
  return { ...document, ...updatedScores };
};

export const performVote = async ({
  collectionName,
  document,
  user,
  voteType,
  extendedVote,
  skipRateLimits,
  toggleIfAlreadyVoted = true,
}: {
  collectionName: VoteableCollectionName;
  document: VoteableDocument;
  user: CurrentUser;
  voteType: VoteType;
  extendedVote?: Record<string, string>;
  skipRateLimits?: boolean;
  toggleIfAlreadyVoted?: boolean;
}): Promise<{
  baseScore: number;
  voteCount: number;
  voteType: VoteType;
  showVotingPatternWarning: boolean;
}> => {
  const voteTypeAction = `${collectionName.toLowerCase()}.${voteType}`;
  if (!extendedVote && voteType !== "neutral" && !userCanDo(user, voteTypeAction)) {
    throw new Error(`User can't cast votes of type ${voteTypeAction}`);
  }

  const power = calculateVotePower(user.karma, voteType);
  const authors = await fetchVoteableDocumentAuthors(document);
  const authorIds = authors.map(({ _id }) => _id);
  const isSelfVote = authorIds.includes(user._id);

  if (
    !isSelfVote &&
    collectionName === "Comments" &&
    (document as Comment).debateResponse &&
    (document as Comment).postId
  ) {
    const post = await db.query.posts.findFirst({
      columns: {
        userId: true,
        coauthorUserIds: true,
      },
      where: {
        _id: (document as Comment).postId!,
      },
    });
    const authorIds = post ? [...post.coauthorUserIds, post.userId] : [];
    if (!authorIds.includes(user._id)) {
      throw new Error("Cannot vote on debate responses unless you're a coauthor");
    }
  }

  if (
    collectionName === "Revisions" &&
    (document as Revision).collectionName !== "Tags"
  ) {
    throw new Error("Revisions are only voteable if they're revisions of tags");
  }

  const existingVote = await db.query.votes.findFirst({
    where: {
      documentId: document._id,
      userId: user._id,
      cancelled: false,
    },
  });

  const schema = voteableSchemas[collectionName];

  let showVotingPatternWarning = false;
  if (existingVote && existingVote.voteType === voteType && !extendedVote) {
    if (toggleIfAlreadyVoted) {
      document = await db.transaction((txn) =>
        clearVotes({
          collectionName,
          schema,
          document,
          authors,
          user,
          txn,
        }),
      );
    }
    return {
      baseScore: document.baseScore,
      voteCount: document.voteCount,
      voteType: "neutral",
      showVotingPatternWarning,
    };
  }

  if (!skipRateLimits) {
    const { moderatorActionType } = await checkVotingRateLimits(
      document,
      user,
      voteType,
    );
    if (
      moderatorActionType &&
      !(await wasVotingPatternWarningDeliveredRecently(user, moderatorActionType))
    ) {
      if (moderatorActionType === "votingPatternWarningDelivered") {
        showVotingPatternWarning = true;
      }
      void createModeratorAction(user._id, moderatorActionType);
    }
  }

  // TODO: Here check the validity of the extended vote

  const { baseScore, voteCount } = await db.transaction(async (txn) => {
    // Create the new vote
    await txn.insert(votes).values({
      _id: randomId(),
      collectionName,
      documentId: document._id,
      userId: user._id,
      authorIds,
      voteType,
      power,
      votedAt: new Date().toISOString(),
    });

    // Update scores on the voted document
    const updatedScores = await recalculateDocumentScores(document, txn);
    const newDocument: VoteableDocument = { ...document, ...updatedScores };
    await txn
      .update(schema)
      .set({
        ...("inactive" in schema ? { inactive: false } : null),
        ...updatedScores,
      })
      .where(eq(schema._id, document._id));

    // Invalidate any old votes
    await clearVotes({
      collectionName,
      schema,
      document,
      authors,
      user,
      excludeLatest: true,
      txn,
    });

    // Run callbacks
    await Promise.all([
      updateUserKarma(txn, collectionName, authors, user._id, power),
      updateUserVoteCounts(txn, authors, user._id, voteType, 1),
      increasePostMaxBaseScore(txn, collectionName, newDocument),
      triggerCommentAutomod(txn, collectionName, newDocument),
      // TODO: We still need the following ForumMagnum vote callbacks
      // voteUpdatePostDenormalizedTags
      // recomputeContributorScoresFor
    ]);

    return updatedScores;
  });

  if (collectionIsSearchIndexed(collectionName)) {
    void elasticSyncDocument(collectionName, document._id);
  }

  return {
    baseScore,
    voteCount,
    voteType,
    showVotingPatternWarning,
  };
};
