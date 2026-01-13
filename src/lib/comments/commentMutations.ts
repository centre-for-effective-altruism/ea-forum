"use server";

import type { EditorData } from "../ckeditor/editorHelpers";
import { db } from "../db";
import { getCurrentUser } from "../users/currentUser";

export const createPostComment = async (postId: string, data: EditorData) => {
  const { originalContents } = data;
  if (originalContents.type !== "ckEditorMarkup") {
    throw new Error("Invalid editor type");
  }
  if (!originalContents.data) {
    throw new Error("Comment is empty");
  }

  const [user, post] = await Promise.all([
    getCurrentUser(),
    db.query.posts.findFirst({
      columns: {
        _id: true,
      },
      where: {
        _id: postId,
      },
    }),
  ]);
  if (!user) {
    throw new Error("You must be logged in to comment");
  }
  if (!post) {
    throw new Error("Post not found");
  }

  // TODO
  // eslint-disable-next-line no-console
  console.log("ok");
};
