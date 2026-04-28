"use client";

import { useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { CommentsListProvider } from "../Comments/useCommentsList";
import { rpc } from "@/lib/rpc";
import type { CommentListItem } from "@/lib/comments/commentLists";
import CommentsList from "../Comments/CommentsList";
import Loading from "../Loading";
import Type from "../Type";

export default function PostsItemNewComments({
  postId,
  className,
}: Readonly<{
  postId: string;
  className?: string;
}>) {
  const [comments, setComments] = useState<CommentListItem[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const comments = await rpc.comments.listNew({ postId });
        setComments(comments);
      } catch (e) {
        console.error(e);
        captureException(e);
      }
    })();
  }, [postId]);

  return (
    <div data-component="PostsItemNewComments" className={className}>
      {!comments && <Loading />}
      {comments?.length === 0 && (
        <Type className="text-gray-600">No comments found</Type>
      )}
      {comments && comments.length > 0 && (
        <CommentsListProvider comments={comments}>
          <CommentsList />
        </CommentsListProvider>
      )}
    </div>
  );
}
