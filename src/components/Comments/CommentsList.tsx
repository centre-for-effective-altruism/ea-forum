"use client";

import { useCommentsList } from "./useCommentsList";
import clsx from "clsx";
import Type from "../Type";
import CommentItem from "./CommentItem";

export default function CommentsList({
  borderless,
  className,
}: Readonly<{
  borderless?: boolean;
  className?: string;
}>) {
  const { comments } = useCommentsList();
  return (
    <section
      className={clsx("flex flex-col gap-4", className)}
      data-component="CommentsList"
    >
      {comments.length === 0 && (
        <div className="text-gray-600 text-center">
          <Type>No comments on this post yet.</Type>
          <Type>Be the first to respond.</Type>
        </div>
      )}
      {comments.map((node) => (
        <CommentItem node={node} borderless={borderless} key={node.comment._id} />
      ))}
    </section>
  );
}
