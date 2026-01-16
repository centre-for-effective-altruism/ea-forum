"use server";

import { headers } from "next/headers";
import { getCurrentUser } from "../users/currentUser";
import { createPostComment } from "./commentMutations";
import type { EditorData } from "../ckeditor/editorHelpers";
import { fetchCommentsListItem } from "./commentLists";

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
  const commentId = await createPostComment({
    user,
    postId,
    parentCommentId,
    data,
    draft,
    userAgent,
    referrer,
  });
  return await fetchCommentsListItem({
    currentUserId: user._id,
    commentId,
  });
};
