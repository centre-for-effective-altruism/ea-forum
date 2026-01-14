import { sql } from "drizzle-orm";
import type { DbOrTransaction } from "../db";
import type { Vote } from "../schema";

export type RecentVoteInfo = Pick<
  Vote,
  "_id" | "userId" | "power" | "documentId"
> & {
  collectionName: "Posts" | "Comments";
  postedAt: Date;
  votedAt: Date;
  totalDocumentKarma: number;
};

type RecentVoteInfoStringDates = Omit<RecentVoteInfo, "postedAt" | "votedAt"> & {
  postedAt: string;
  votedAt: string;
};

export const RECENT_CONTENT_COUNT = 20;

const getProjection = (votesTable: string, contentTable: string) => `
  "${votesTable}"._id,
  "${votesTable}"."userId",
  "${votesTable}"."power",
  "${votesTable}"."documentId",
  "${votesTable}"."collectionName",
  "${votesTable}"."votedAt",
  "${contentTable}"."postedAt",
  "${contentTable}"."baseScore" AS "totalDocumentKarma"
`;

const convertDates = (info: RecentVoteInfoStringDates): RecentVoteInfo => ({
  ...info,
  postedAt: new Date(info.postedAt),
  votedAt: new Date(info.votedAt),
});

export const getVotesOnRecentContent = async (
  txn: DbOrTransaction,
  userId: string,
): Promise<RecentVoteInfo[]> => {
  const result = await txn.execute<RecentVoteInfoStringDates>(sql`
    -- getVotesOnRecentContent
    (
      SELECT ${sql.raw(getProjection("Votes", "Posts"))}
      FROM "Votes"
      JOIN "Posts" on "Posts"._id = "Votes"."documentId"
      WHERE
        "Votes"."documentId" in (
          SELECT _id FROM "Posts"
          WHERE
            "Posts"."userId" = ${userId}
            AND
            "Posts"."draft" IS NOT true
          ORDER BY "Posts"."postedAt" DESC
          LIMIT ${RECENT_CONTENT_COUNT}
        )
        AND
        "cancelled" IS NOT true
      ORDER BY "Posts"."postedAt" DESC
    )
    UNION
    (
      SELECT ${sql.raw(getProjection("Votes", "Comments"))}
      FROM "Votes"
      JOIN "Comments" on "Comments"._id = "Votes"."documentId"
      WHERE
        "Votes"."documentId" in (
          SELECT _id FROM "Comments"
          WHERE
            "Comments"."userId" = ${userId}
            AND
            "Comments"."debateResponse" IS NOT true
          ORDER by "Comments"."postedAt" DESC
          LIMIT ${RECENT_CONTENT_COUNT}
        )
        AND
        "cancelled" IS NOT true
      ORDER BY "Comments"."postedAt" DESC
    )
  `);
  return result.rows.map(convertDates);
};
