"use client";

import { useCallback } from "react";
import type { CommentListItem } from "@/lib/comments/commentLists";
import { useCommentEditor } from "@/lib/hooks/useCommentEditor";
import { useCommentsList } from "./useCommentsList";
import CommentForm from "./CommentForm";

export default function NewComment({
  postId,
  parentCommentId,
  onSuccess,
  className,
}: Readonly<{
  postId: string;
  parentCommentId?: string;
  onSuccess?: (comment: CommentListItem) => void;
  className?: string;
}>) {
  const { addTopLevelComment } = useCommentsList();
  const onCommentSuccess = useCallback(
    (comment: CommentListItem) => {
      onSuccess?.(comment);
      addTopLevelComment(comment);
    },
    [addTopLevelComment, onSuccess],
  );
  const props = useCommentEditor({
    postId,
    parentCommentId,
    onSuccess: onCommentSuccess,
  });
  return <CommentForm {...props} className={className} />;
}
