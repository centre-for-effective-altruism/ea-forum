"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { CommentsListProvider } from "../Comments/useCommentsList";
import { rpc } from "@/lib/rpc";
import type { CommentListItem } from "@/lib/comments/commentLists";
import TextLinkButton from "../TextLinkButton";
import CommentsList from "../Comments/CommentsList";
import Loading from "../Loading";

export default function UserProfileCommentsList({
  initialComments,
  userId,
  canLoadMore: initialCanLoadMore,
}: {
  initialComments: CommentListItem[];
  userId: string;
  canLoadMore: boolean;
}) {
  const [comments, setComments] = useState(initialComments);
  const [canLoadMore, setCanLoadMore] = useState(initialCanLoadMore);
  const [loading, setLoading] = useState(false);

  const onLoadMore = useCallback(async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      const limit = 10;
      const newComments = await rpc.comments.listUserProfile({
        userId,
        offset: comments.length,
        limit,
      });
      setComments((comments) => [...comments, ...newComments]);
      if (newComments.length < limit) {
        setCanLoadMore(false);
      }
    } catch (e) {
      console.error(e);
      captureException(e);
      setCanLoadMore(false);
    }
    setLoading(false);
  }, [userId, loading, comments.length]);

  return (
    <div
      data-component="UserProfileCommentsList"
      className="flex flex-col items-start gap-2"
    >
      {comments.map((comment) => (
        <CommentsListProvider key={comment._id} showPostTitle comments={[comment]}>
          <CommentsList />
        </CommentsListProvider>
      ))}
      {canLoadMore &&
        (loading ? (
          <Loading />
        ) : (
          <TextLinkButton onClick={onLoadMore}>Load more</TextLinkButton>
        ))}
    </div>
  );
}
