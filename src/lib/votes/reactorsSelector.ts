import "server-only";
import { sql } from "drizzle-orm";
import { publicReactionPalette } from "./reactions";
import type { comments, posts } from "../schema";

const publicReactionNamesSql = publicReactionPalette
  .map(({ name }) => `'${name}'`)
  .join(",");

export const reactorsSelector =
  (collectionName: "Posts" | "Comments") =>
  (table: typeof posts | typeof comments) =>
    sql<Record<string, string[]> | null>`(
      SELECT JSONB_OBJECT_AGG("reaction", "displayNames")
      FROM (
        SELECT
          e."key" AS "reaction",
          ARRAY_AGG(u."displayName" ORDER BY v."createdAt") AS "displayNames"
        FROM "Votes" v
        JOIN "Users" u ON u."_id" = v."userId" AND u."deleted" IS NOT TRUE
        CROSS JOIN JSONB_EACH(v."extendedVoteType") AS e
        WHERE
          v."collectionName" = ${collectionName}
          AND v."documentId" = ${table}."_id"
          AND v."cancelled" IS NOT TRUE
          AND v."isUnvote" IS NOT TRUE
          AND v."extendedVoteType" IS NOT NULL
          AND e."key" IN (${sql.raw(publicReactionNamesSql)})
          AND e."value" = 'true'::JSONB
        GROUP BY e."key"
      ) reactors
    )`;
