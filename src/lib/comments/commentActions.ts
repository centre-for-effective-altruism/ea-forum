"use server";

import { headers } from "next/headers";
import { getCurrentUser } from "../users/currentUser";
import { createPostComment } from "./commentMutations";
import type { EditorData } from "../ckeditor/editorHelpers";

export const createPostCommentAction = async ({
  postId,
  parentCommentId,
  data,
  draft,
}: {
  postId: string;
  parentCommentId: string | null;
  data: EditorData;
  draft?: false;
}) => {
  const [headerStore, user] = await Promise.all([headers(), getCurrentUser()]);
  if (!user) {
    throw new Error("You must be logged in to comment");
  }
  const userAgent = headerStore.get("user-agent");
  const referrer = headerStore.get("referer");
  return createPostComment({
    user,
    postId,
    parentCommentId,
    data,
    draft,
    userAgent,
    referrer,
  });
};
