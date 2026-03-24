"use client";

import { useCommentsList } from "./useCommentsList";
import { useCommentEditor } from "@/lib/hooks/useCommentEditor";
import CommentForm from "./CommentForm";

export default function NewComment({
  postId,
  className,
}: Readonly<{
  postId: string;
  className?: string;
}>) {
  const { addTopLevelComment } = useCommentsList();
  const props = useCommentEditor({
    postId,
    onSuccess: addTopLevelComment,
  });
  return <CommentForm {...props} className={className} />;
}
