"use client";

import { FC, useCallback, useEffect, useState } from "react";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { CommentToEdit } from "@/lib/comments/commentQueries";
import type { EditorData } from "@/lib/ckeditor/editorHelpers";
import { useCommentsList } from "./useCommentsList";
import { useCommentEditor } from "@/lib/hooks/useCommentEditor";
import { rpc } from "@/lib/rpc";
import CommentForm from "./CommentForm";
import Loading from "../Loading";
import Type from "../Type";

const EditCommentInner: FC<{
  comment: CommentToEdit;
  cancelLabel?: string,
  beforeSubmit?: (data: EditorData) => void,
  onSuccess?: () => void;
}> = ({ comment, beforeSubmit, onSuccess: onSuccessCallback, ...passthroughProps }) => {
  const { updateComment } = useCommentsList();
  const onSuccess = useCallback(
    (updatedComment: CommentListItem) => {
      updateComment(updatedComment);
      onSuccessCallback?.();
    },
    [updateComment, onSuccessCallback],
  );
  const props = useCommentEditor({
    comment,
    beforeSubmit,
    onSuccess,
  });
  return <CommentForm {...props} {...passthroughProps} />;
};

export default function EditComment({
  commentId,
  onSuccess,
  className,
  ...passthroughProps
}: Readonly<{
  commentId: string;
  cancelLabel?: string,
  onCancel?: () => void,
  beforeSubmit?: (data: EditorData) => void,
  onSuccess?: () => void;
  className?: string;
}>) {
  const [comment, setComment] = useState<CommentToEdit | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const comment = await rpc.comments.fetchToEdit({ commentId });
        setComment(comment);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    })();
  }, [commentId]);

  return (
    <div data-component="EditComment" className={className}>
      {comment ? (
        <EditCommentInner comment={comment} onSuccess={onSuccess} {...passthroughProps} />
      ) : error ? (
        <Type>Error: {error}</Type>
      ) : (
        <Loading />
      )}
    </div>
  );
}
