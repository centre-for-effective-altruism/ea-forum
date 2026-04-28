"use client";

import { useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { CommentsListProvider } from "../Comments/useCommentsList";
import { useRecordPostView } from "@/lib/hooks/useRecordPostView";
import { rpc } from "@/lib/rpc";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { PostListItem } from "@/lib/posts/postLists";
import CommentsList from "../Comments/CommentsList";
import Loading from "../Loading";
import Type from "../Type";

export default function PostsItemNewComments({
  post,
  className,
}: Readonly<{
  post: PostListItem;
  className?: string;
}>) {
  const { recordPostView } = useRecordPostView(post);
  const [comments, setComments] = useState<CommentListItem[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const comments = await rpc.comments.listNew({ postId: post._id });
        setComments(comments);
      } catch (e) {
        console.error(e);
        captureException(e);
      }
    })();
  }, [post]);

  useEffect(() => {
    void recordPostView({
      post,
      extraEventProperties: {
        type: "toggleComments",
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
