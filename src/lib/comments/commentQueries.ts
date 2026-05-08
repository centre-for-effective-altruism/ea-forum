import { sql } from "drizzle-orm";
import { db, DbOrTransaction } from "../db";
import type { CurrentUser } from "../users/currentUser";
import type { EditorContents } from "../ckeditor/editorHelpers";
import { userCanEditComment } from "./commentHelpers";

type CommentWithAncestor = {
  _id: string;
  parentCommentId: string | null;
  userId: string;
  depth: number;
};

/**
 * For a given comment, fetch the ids of all of its parents recursively
 */
export const fetchCommentAncestors = async (
  txn: DbOrTransaction,
  commentId: string,
): Promise<CommentWithAncestor[]> => {
  const result = await txn.execute<CommentWithAncestor>(sql`
    WITH RECURSIVE "comment_ancestors" AS (
      SELECT "_id", "parentCommentId", "userId" 0 AS "depth"
      FROM "Comments"
      WHERE "_id" = ${commentId}
      UNION ALL
      SELECT c."_id", c."parentCommentId", "userId" ca."depth" + 1
      FROM "Comments" c
      INNER JOIN "comment_ancestors" ca ON c."_id" = ca."parentCommentId"
      WHERE ca."parentCommentId" IS NOT NULL
    )
    SELECT "_id" FROM "comment_ancestors" WHERE "_id" <> ${commentId}
    ORDER BY "depth" ASC
  `);
  return result.rows;
};

/** Fetches a post, returning just the fields needed to create a comment on it */
export const fetchPostForCommentCreation = ({
  txn,
  postId,
  shortform,
  userId,
}: {
  txn: DbOrTransaction;
  postId?: string;
  shortform: boolean;
  userId: string;
}) =>
  txn.query.posts.findFirst({
    columns: {
      _id: true,
      slug: true,
      draft: true,
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
    where: shortform
      ? {
          shortform,
          userId,
        }
      : {
          _id: postId,
        },
  });

export type PostForCommentCreation = NonNullable<
  Awaited<ReturnType<typeof fetchPostForCommentCreation>>
>;

export const fetchCommentToEdit = async (
  currentUser: CurrentUser,
  commentId: string,
) => {
  const comment = await db.query.comments.findFirst({
    columns: {
      _id: true,
      userId: true,
      shortform: true,
    },
    extras: {
      originalContents: (comments) =>
        sql<EditorContents>`${comments}."contents"->'originalContents'`,
    },
    where: {
      _id: commentId,
    },
  });
  if (!comment) {
    throw new Error("Comment not found");
  }
  if (!userCanEditComment(currentUser, comment)) {
    throw new Error("You do not have permission to edit this comment");
  }
  return comment;
};

export type CommentToEdit = Awaited<ReturnType<typeof fetchCommentToEdit>>;
