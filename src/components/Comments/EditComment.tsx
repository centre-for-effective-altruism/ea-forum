"use client";

import { FC, useCallback, useEffect, useState } from "react";
import type { CommentToEdit } from "@/lib/comments/commentQueries";
import type { CommentsList } from "@/lib/comments/commentLists";
import { useCommentsList } from "./useCommentsList";
import { useCommentEditor } from "@/lib/hooks/useCommentEditor";
import { rpc } from "@/lib/rpc";
import CommentForm from "./CommentForm";
import Loading from "../Loading";
import Type from "../Type";

const EditCommentInner: FC<{
  comment: CommentToEdit;
  onFinishEdit?: () => void;
}> = ({ comment, onFinishEdit }) => {
  const { updateComment } = useCommentsList();
  const onSuccess = useCallback(
    (updatedComment: CommentsList) => {
      updateComment(updatedComment);
      onFinishEdit?.();
    },
    [updateComment, onFinishEdit],
  );
  const props = useCommentEditor({
    comment,
    onSuccess,
  });
  return <CommentForm {...props} />;
};

export default function EditComment({
  commentId,
  onFinishEdit,
  className,
}: Readonly<{
  commentId: string;
  onFinishEdit?: () => void;
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
        <EditCommentInner comment={comment} onFinishEdit={onFinishEdit} />
      ) : error ? (
        <Type>Error: {error}</Type>
      ) : (
        <Loading />
      )}
    </div>
  );
}
