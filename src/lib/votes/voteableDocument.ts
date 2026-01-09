import sumBy from "lodash/sumBy";
import { filterNonNull } from "../typeHelpers";
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

export const voteableSchemas = {
  Posts: posts,
  Comments: comments,
  Revisions: revisions,
  Tags: tags,
} as const;

export type VoteableCollectionName = keyof typeof voteableSchemas;

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

export const fetchVoteableDocumentAuthors = (document: VoteableDocument) => {
  const authorIds = [document.userId];
  if ("coauthorUserIds" in document) {
    authorIds.push(...document.coauthorUserIds);
  }
  return db.query.users.findMany({
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

/**
 * We apply a score boost to subforum comments using the formula:
 *   max(b, m * (1 - ((x / d) ** p)))
 * where b is the base (the minimum boost received after the duration
 * has expired), m is the magnitude (the maximum boost when the comment
 * is first posted), d is the duration in hours, p is the exponent
 * (defining the dropoff curve), and x is the elapsed time since the
 * comment was posted in hours.
 */
const subforumCommentBonus = {
  base: 5,
  magnitude: 100,
  duration: 8,
  exponent: 0.3,
} as const;

const getSubforumCommentBonus = (document: VoteableDocument, ageInHours: number) => {
  if ("tagCommentType" in document && document.tagCommentType === "SUBFORUM") {
    const { base, magnitude, duration, exponent } = subforumCommentBonus;
    return Math.max(base, magnitude * (1 - (ageInHours / duration) ** exponent));
  }
  return 0;
};

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
    baseScore += getSubforumCommentBonus(document, ageInHours);

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
  document: VoteableDocument,
  txn?: DbOrTransaction,
) => {
  const votes = await (txn ?? db).query.votes.findMany({
    columns: {
      power: true,
      voteType: true,
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
  return {
    baseScore,
    voteCount,
    extendedScore: {}, // TODO: Emojis
    score: recalculateScore({ ...document, baseScore }),
  };
};
