import "server-only";
import { LRUCache } from "lru-cache";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { publicReactionPalette } from "./reactions";

// Map from emoji names to an array of user display names
export type PostReactors = Record<string, string[]>;

const postReactorCache = new LRUCache<string, Promise<PostReactors>>({
  ttl: 30 * 1000, // 30 second TTL
  ttlAutopurge: false,
  updateAgeOnGet: false,
  max: 1000,
});

// Map from comment ids to maps from emoji names to an array of user display names
export type CommentReactors = Record<string, Record<string, string[]>>;

const commentReactorCache = new LRUCache<string, Promise<CommentReactors>>({
  ttl: 30 * 1000, // 30 second TTL
  ttlAutopurge: false,
  updateAgeOnGet: false,
  max: 1000,
});

const publicReactionNamesSql = publicReactionPalette
  .map(({ name }) => `'${name}'`)
  .join(",");

export const fetchPostReactors = async (postId: string): Promise<PostReactors> => {
  const result = await db.execute<{ reactors: PostReactors }>(sql`
    -- fetchPostReactors
    SELECT JSON_OBJECT_AGG("key", "displayNames") AS "reactors"
    FROM (
      SELECT
        "key",
        (ARRAY_AGG(
          "displayName" ORDER BY "createdAt" ASC)
        ) AS "displayNames"
      FROM (
        SELECT
          u."displayName",
          v."createdAt",
          (JSONB_EACH(v."extendedVoteType")).*
        FROM "Votes" v
        JOIN "Users" u ON u."_id" = v."userId"
        WHERE
          v."collectionName" = 'Posts' AND
          v."documentId" = ${postId} AND
          v."cancelled" IS NOT TRUE AND
          v."isUnvote" IS NOT TRUE AND
          v."extendedVoteType" IS NOT NULL
      ) q
      WHERE
        "key" IN (${sql.raw(publicReactionNamesSql)})
        AND "value" = TO_JSONB(TRUE)
      GROUP BY "key"
    ) q
  `);
  return result.rows[0]?.reactors ?? {};
};

export const fetchPostReactorsWithCache = (
  postId: string,
): Promise<PostReactors> => {
  const cached = postReactorCache.get(postId);
  if (cached !== undefined) {
    return cached;
  }
  const emojiReactors = fetchPostReactors(postId);
  postReactorCache.set(postId, emojiReactors);
  return emojiReactors;
};

export const fetchCommentReactors = async (
  postId: string,
): Promise<CommentReactors> => {
  const result = await db.execute<{ reactors: CommentReactors }>(sql`
    -- PostsRepo.fetchCommentReactors
    SELECT JSON_OBJECT_AGG("commentId", "reactorDisplayNames") AS "reactors"
    FROM (
      SELECT
        "commentId",
        JSON_OBJECT_AGG("key", "displayNames")
          FILTER (WHERE "key" IN (${sql.raw(publicReactionNamesSql)}))
          AS "reactorDisplayNames"
      FROM (
        SELECT
          "commentId",
          "key",
          (ARRAY_AGG(
            "displayName" ORDER BY "createdAt" ASC)
          ) AS "displayNames"
        FROM (
          SELECT
            c."_id" AS "commentId",
            u."displayName",
            v."createdAt",
            (JSONB_EACH(v."extendedVoteType")).*
          FROM "Comments" c
          JOIN "Votes" v ON
            v."collectionName" = 'Comments' AND
            v."documentId" = c."_id" AND
            v."cancelled" IS NOT TRUE AND
            v."isUnvote" IS NOT TRUE AND
            v."extendedVoteType" IS NOT NULL
          JOIN "Users" u ON u."_id" = v."userId"
          WHERE c."postId" = ${postId}
        ) q
        WHERE "value" = TO_JSONB(TRUE)
        GROUP BY "commentId", "key"
      ) q
      GROUP BY "commentId"
    ) q
  `);
  return result.rows[0]?.reactors ?? {};
};

export const fetchCommentReactorsWithCache = (
  postId: string,
): Promise<CommentReactors> => {
  const cached = commentReactorCache.get(postId);
  if (cached !== undefined) {
    return cached;
  }
  const emojiReactors = fetchCommentReactors(postId);
  commentReactorCache.set(postId, emojiReactors);
  return emojiReactors;
};
