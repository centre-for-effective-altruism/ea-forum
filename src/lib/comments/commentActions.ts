"use server";

import { getCurrentUser } from "../users/currentUser";
import { createPostComment } from "./commentMutations";
import { fetchCommentsListItem, fetchFrontpageQuickTakes } from "./commentLists";
import type { EditorData } from "../ckeditor/editorHelpers";

export const createPostCommentAction = async ({
  postId,
  parentCommentId,
  editorData,
  draft,
}: {
  postId: string;
  parentCommentId: string | null;
  editorData: EditorData;
  draft?: false;
}) => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("You must be logged in to comment");
  }
  const commentId = await createPostComment({
    user,
    postId,
    parentCommentId,
    editorData,
    draft,
  });
  return await fetchCommentsListItem({
    currentUserId: user._id,
    commentId,
  });
};

export const fetchQuickTakesAction = async ({
  includeCommunity,
  relevantTagId,
  offset,
  limit,
}: {
  includeCommunity?: boolean;
  relevantTagId?: string;
  offset?: number;
  limit?: number;
}) => {
  if (typeof limit === "number" && (limit < 1 || limit > 50)) {
    throw new Error("Invalid limit");
  }
  if (typeof offset === "number" && offset < 0) {
    throw new Error("Invalid offset");
  }
  const currentUser = await getCurrentUser();
  return fetchFrontpageQuickTakes({
    currentUserId: currentUser?._id ?? null,
    includeCommunity,
    relevantTagId,
    offset,
    limit,
  });
};
