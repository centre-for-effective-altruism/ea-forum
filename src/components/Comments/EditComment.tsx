"use client";

import { FC, useEffect, useState } from "react";
import type { CommentToEdit } from "@/lib/comments/commentQueries";
import { useCommentsList } from "./useCommentsList";
import { useCommentEditor } from "@/lib/hooks/useCommentEditor";
import { rpc } from "@/lib/rpc";
import CommentForm from "./CommentForm";
import Loading from "../Loading";
import Type from "../Type";

const EditCommentInner: FC<{ comment: CommentToEdit }> = ({ comment }) => {
  const { addTopLevelComment } = useCommentsList();
  const props = useCommentEditor({
    comment,
    onSuccess: addTopLevelComment,
  });
  return <CommentForm {...props} />;
};

export default function EditComment({
  commentId,
  className,
}: Readonly<{
  commentId: string;
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
        <EditCommentInner comment={comment} />
      ) : error ? (
        <Type>Error: {error}</Type>
      ) : (
        <Loading />
      )}
    </div>
  );
}
