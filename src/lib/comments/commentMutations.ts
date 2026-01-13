"use server";

import { headers } from "next/headers";
import type { EditorData } from "../ckeditor/editorHelpers";
import { comments, InsertComment } from "../schema";
import { db } from "../db";
import { getCurrentUser } from "../users/currentUser";
import { randomId } from "../utils/random";

const MINIMUM_APPROVAL_KARMA = 5;

export const createPostComment = async (
  postId: string,
  parentCommentId: string | null,
  data: EditorData,
) => {
  const { originalContents } = data;
  if (originalContents.type !== "ckEditorMarkup") {
    throw new Error("Invalid editor type");
  }
  if (!originalContents.data) {
    throw new Error("Comment is empty");
  }

  const [headerStore, user, post, parentComment] = await Promise.all([
    headers(),
    getCurrentUser(),
    db.query.posts.findFirst({
      columns: {
        _id: true,
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
    }),
    parentCommentId
      ? db.query.comments.findFirst({
          columns: {
            _id: true,
            topLevelCommentId: true,
            answer: true,
            parentAnswerId: true,
            tagId: true,
            tagCommentType: true,
          },
          where: {
            _id: parentCommentId,
          },
        })
      : null,
  ]);
  if (!user) {
    throw new Error("You must be logged in to comment");
  }
  if (!post) {
    throw new Error("Post not found");
  }
  if (parentCommentId && !parentComment) {
    throw new Error("Parent comment not found");
  }

  // TODO: Create revision
  // TODO: Create shortform post if needed
  // TODO: modGPT
  // TODO: shortform, shortformFrontpage, spam, needsReview, relevantTagIds

  const now = new Date().toISOString();
  const comment: InsertComment = {
    _id: randomId(),
    postId: post._id,
    userId: user._id,
    author: user.displayName || user.username,
    userAgent: headerStore.get("user-agent"),
    referrer: headerStore.get("referer"),
    authorIsUnreviewed:
      !user?.reviewedByUserId && user.karma < MINIMUM_APPROVAL_KARMA,
    parentCommentId,
    topLevelCommentId: parentComment?.topLevelCommentId ?? parentCommentId,
    parentAnswerId:
      parentComment?.parentAnswerId ??
      (parentComment?.answer ? parentCommentId : null),
    postVersion: post.contents?.version || "1.0.0",
    postedAt: now,
    createdAt: now,
    lastEditedAt: now,
    lastSubthreadActivity: now,
  };

  await db.insert(comments).values(comment);

  return comment._id;
};
