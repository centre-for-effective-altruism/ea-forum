"use client";

import { useCallback } from "react";
import type { CommentListItem } from "@/lib/comments/commentLists";
import { useCommentsList } from "./useCommentsList";
import {
  CommentPrefilledProps,
  useCommentEditor,
  UseCommentEditorProps,
} from "@/lib/hooks/useCommentEditor";
import CommentForm from "./CommentForm";

export default function NewComment({
  postId,
  parentCommentId,
  beforeSubmit,
  onSuccess,
  prefilledProps,
  htmlTemplate,
  className,
  ...formProps
}: Readonly<
  Pick<UseCommentEditorProps, "beforeSubmit" | "onSuccess"> & {
    postId: string;
    parentCommentId?: string;
    prefilledProps?: CommentPrefilledProps;
    htmlTemplate?: string;
    cancelLabel?: string;
    onCancel?: () => void;
    className?: string;
  }
>) {
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
    beforeSubmit,
    onSuccess: onCommentSuccess,
    prefilledProps,
    htmlTemplate,
  });
  return <CommentForm {...props} {...formProps} className={className} />;
}
