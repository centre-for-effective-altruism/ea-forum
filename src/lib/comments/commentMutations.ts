"use server";

import { headers } from "next/headers";
import type { EditorData } from "../ckeditor/editorHelpers";
import { db } from "../db";
import { getCurrentUser } from "../users/currentUser";

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

  void headerStore;
};
