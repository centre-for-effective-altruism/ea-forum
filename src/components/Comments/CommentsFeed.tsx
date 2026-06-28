"use client";

import { useCallback, useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import range from "lodash/range";
import type { CommentListItem } from "@/lib/comments/commentLists";
import CommentItem from "./CommentItem";
import TextLinkButton from "../TextLinkButton";

/**
 * Unlike `CommentsList` which shows a tree of comments (for instance, underneath
 * a post), this component displays a flat list of comments with a button to
 * load more (more like a posts list).
 */
export default function CommentsFeed({
  comments,
  loadMore,
  className,
}: Readonly<{
  comments: CommentListItem[];
  loadMore: (props: { offset: number; limit: number }) => Promise<CommentListItem[]>;
  className?: string;
}>) {
  const [loadMoreLimit] = useState(comments.length || 3);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(comments.length);
  const [displayedComments, setDisplayedComments] = useState(comments);
  const [canLoadMore, setCanLoadMore] = useState(true);

  const onLoadMore = useCallback(async () => {
    const offset_ = offset;
    setOffset((offset) => offset + loadMoreLimit);
    setLoading(true);

    try {
      const data = await loadMore({
        limit: loadMoreLimit,
        offset: offset_,
      });
      setDisplayedComments((comments) => [...comments, ...data]);
      if (data.length < loadMoreLimit) {
        setCanLoadMore(false);
      }
    } catch (e) {
      console.error("Error loading comments:", e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      captureException(e);
    } finally {
      setLoading(false);
    }
  }, [loadMore, loadMoreLimit, offset]);

  useEffect(() => {
    if (displayedComments.length === 0 && !loading && canLoadMore) {
      void onLoadMore();
    }
  }, [displayedComments, loading, canLoadMore, onLoadMore]);

  return (
    <section data-component="CommentsFeed" className={className}>
      {displayedComments.map((comment) => (
        <CommentItem
          key={comment._id}
          node={{ comment, depth: 0, children: [], isLocal: false }}
          showPreviewWhenCollapsed
          startCollapsed
          className="bg-comment-even!"
        />
      ))}
      {loading &&
        range(loadMoreLimit).map((i) => (
          <div key={i} className="w-full h-[80px] bg-gray-200 rounded mb-1" />
        ))}
      {canLoadMore && (
        <TextLinkButton variant="primary" onClick={onLoadMore}>
          Load more
        </TextLinkButton>
      )}
    </section>
  );
}
