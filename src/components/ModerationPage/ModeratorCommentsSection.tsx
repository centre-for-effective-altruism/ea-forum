"use client";

import CommentItem from "@/components/Comments/CommentItem";
import type { CommentsList } from "@/lib/comments/commentLists";

export default function ModeratorCommentsSection({
  comments,
}: {
  comments: CommentsList[];
}) {
  return (
    <div
      className="flex max-w-3xl flex-col gap-1"
      data-component="ModeratorCommentsSection"
    >
      {comments.map((comment) => (
        <CommentItem
          key={comment._id}
          node={{ comment, depth: 0, children: [], isLocal: false }}
          startCollapsed
          showPreviewWhenCollapsed
          showPermalink={false}
          showMenu={false}
        />
      ))}
    </div>
  );
}
