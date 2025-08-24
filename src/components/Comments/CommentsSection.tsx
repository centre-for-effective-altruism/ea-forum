import { useMemo } from "react";
import type { IPostComments } from "@/lib/comments/commentQueries.schemas";
import { commentsToCommentTree } from "@/lib/CommentTree";
import CommentItem from "./CommentItem";

export default function CommentsSection({
  comments,
  className = "",
}: Readonly<{ comments: IPostComments[]; className?: string }>) {
  const tree = useMemo(() => commentsToCommentTree(comments), [comments]);
  return (
    <section
      className={`flex flex-col gap-4 ${className}`}
      data-component="CommentsSection"
    >
      {tree.map((node) => (
        <CommentItem node={node} key={node.comment._id} />
      ))}
    </section>
  );
}
