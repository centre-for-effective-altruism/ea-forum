"use client";

import { useCallback } from "react";
import { rpc } from "@/lib/rpc";
import type { CommentsList } from "@/lib/comments/commentLists";
import CommentsFeed from "../Comments/CommentsFeed";

export default function ClientPopularCommentsList({
  initialComments,
  className,
}: Readonly<{
  initialComments: CommentsList[];
  className?: string;
}>) {
  const loadMore = useCallback(
    async (args: { offset: number; limit: number }) =>
      rpc.comments.listPopular(args),
    [],
  );
  return (
    <CommentsFeed
      comments={initialComments}
      loadMore={loadMore}
      className={className}
    />
  );
}
