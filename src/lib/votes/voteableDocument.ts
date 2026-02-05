import sumBy from "lodash/sumBy";
import { z } from "zod/v4";
import fromPairs from "lodash/fromPairs";
import pickBy from "lodash/pickBy";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";
import { filterNonNull } from "../typeHelpers";
import { allReactionNames } from "./reactions";
import { db, DbOrTransaction } from "../db";
import {
  Post,
  Comment,
  Vote,
  posts,
  comments,
  Revision,
  Tag,
  revisions,
  tags,
} from "../schema";

export type VoteableDocument = Post | Comment | Revision | Tag;

export const voteableCollectionNameSchema = z.enum([
  "Posts",
  "Comments",
  "Revisions",
  "Tags",
]);

export type VoteableCollectionName = z.infer<typeof voteableCollectionNameSchema>;

export const voteableSchemas = {
  Posts: posts,
  Comments: comments,
  Revisions: revisions,
  Tags: tags,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as const satisfies Record<VoteableCollectionName, PgTableWithColumns<any>>;

export type VoteableSchema = (typeof voteableSchemas)[keyof typeof voteableSchemas];

export const getVoteableDocument = async (
  collectionName: VoteableCollectionName,
  documentId: string,
): Promise<VoteableDocument | null> => {
  switch (collectionName) {
    case "Posts":
      return (
        ((await db.query.posts.findFirst({
          where: { _id: documentId },
        })) as VoteableDocument) ?? null
      );
    case "Comments":
      return (
        ((await db.query.comments.findFirst({
          where: { _id: documentId },
        })) as VoteableDocument) ?? null
      );
    case "Revisions":
      return (
        ((await db.query.revisions.findFirst({
          where: { _id: documentId },
        })) as VoteableDocument) ?? null
      );
    case "Tags":
      return (
        ((await db.query.tags.findFirst({
          where: { _id: documentId },
        })) as VoteableDocument) ?? null
      );
    default:
      throw new Error(`Invalid collection name: ${collectionName}`);
  }
};

export const fetchVoteableDocumentAuthors = (
  txn: DbOrTransaction,
  document: VoteableDocument,
) => {
  const authorIds = [document.userId];
  if ("coauthorUserIds" in document) {
    authorIds.push(...document.coauthorUserIds);
  }
  return txn.query.users.findMany({
    columns: {
      _id: true,
      karma: true,
      groups: true,
      isAdmin: true,
      banned: true,
    },
    where: {
      _id: { in: filterNonNull(authorIds) },
    },
  });
};

export type VoteableDocumentAuthor = Awaited<
  ReturnType<typeof fetchVoteableDocumentAuthors>
>[0];

/**
 * Exclude neutral votes (i.e. those without a karma change) from the vote
 * count, because it causes confusion in the UI
 */
const voteHasAnyEffect = (vote: Pick<Vote, "voteType" | "power">) =>
  vote.voteType !== "neutral" && !!vote.power;

const FRONTPAGE_BONUS = 10;
const CURATED_BONUS = 10;
const SCORE_BIAS = 2;
const TIME_DECAY_FACTOR = 0.8;

const recalculateScore = (document: VoteableDocument) => {
  if ("postedAt" in document && document.postedAt) {
    const postedAt = new Date(document.postedAt).getTime();
    const now = new Date().getTime();
    const age = now - postedAt;
    const ageInHours = age / (60 * 60 * 1000);

    // Use baseScore if defined, if not just use 0
    let baseScore = document.baseScore || 0;

    if ("frontpageDate" in document && document.frontpageDate) {
      baseScore += FRONTPAGE_BONUS;
    }
    if ("curatedDate" in document && document.curatedDate) {
      baseScore += CURATED_BONUS;
    }

    // HN algorithm
    const newScore =
      Math.round(
        (baseScore / Math.pow(ageInHours + SCORE_BIAS, TIME_DECAY_FACTOR)) * 1000000,
      ) / 1000000;

    return newScore;
  } else {
    return document.baseScore ?? 0;
  }
};

export const recalculateDocumentScores = async (
  txn: DbOrTransaction,
  document: VoteableDocument,
) => {
  const votes = await txn.query.votes.findMany({
    columns: {
      power: true,
      voteType: true,
      extendedVoteType: true,
    },
    where: {
      documentId: document._id,
      cancelled: false,
    },
    orderBy: {
      votedAt: "asc",
    },
  });
  const baseScore = sumBy(votes, (v) => v.power);
  const voteCount = votes.filter(voteHasAnyEffect).length;
  const reactCounts = fromPairs(
    allReactionNames.map((reaction) => [
      reaction,
      sumBy(votes, (v) => (v?.extendedVoteType?.[reaction] ? 1 : 0)),
    ]),
  );
  const extendedScore = pickBy(reactCounts, (count) => count > 0);
  return {
    baseScore,
    voteCount,
    extendedScore,
    score: recalculateScore({ ...document, baseScore }),
  };
};
