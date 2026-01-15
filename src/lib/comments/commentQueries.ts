import { sql } from "drizzle-orm";
import { DbOrTransaction } from "../db";

export const getCommentAncestorIds = async (
  txn: DbOrTransaction,
  commentId: string,
): Promise<string[]> => {
  type CommentWithAncestor = {
    _id: string;
    parentCommentId: string | null;
    depth: number;
  };
  const result = await txn.execute<CommentWithAncestor>(sql`
    WITH RECURSIVE "comment_ancestors" AS (
      SELECT "_id", "parentCommentId", 0 AS "depth"
      FROM "Comments"
      WHERE "_id" = ${commentId}
      UNION ALL
      SELECT c."_id", c."parentCommentId", ca."depth" + 1
      FROM "Comments" c
      INNER JOIN "comment_ancestors" ca ON c."_id" = ca."parentCommentId"
      WHERE ca."parentCommentId" IS NOT NULL
    )
    SELECT "_id" FROM "comment_ancestors" WHERE "_id" <> ${commentId}
    ORDER BY "depth" ASC
  `);
  return result.rows.map((row) => row._id);
};

/** Fetches a post, returning just the fields needed to create a comment on it */
export const getPostForCommentCreation = (txn: DbOrTransaction, postId: string) =>
  txn.query.posts.findFirst({
    columns: {
      _id: true,
      slug: true,
      isEvent: true,
      groupId: true,
      userId: true,
      ignoreRateLimits: true,
      coauthorUserIds: true,
    },
    with: {
      contents: {
        columns: {
          version: true,
        },
      },
    },
    where: {
      _id: postId,
    },
  });

export type PostForCommentCreation = NonNullable<
  Awaited<ReturnType<typeof getPostForCommentCreation>>
>;
