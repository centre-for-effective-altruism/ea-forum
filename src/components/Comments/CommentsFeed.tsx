"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import range from "lodash/range";
import { rpc } from "@/lib/rpc";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { CommentTreeNode } from "@/lib/comments/CommentTree";
import {
  CommentsListProvider,
  useCommentsList,
  useOptionalCommentsList,
} from "./useCommentsList";
import CommentItem from "./CommentItem";
import TextLinkButton from "../TextLinkButton";

const CommentsFeedItemWithRepliesInner = ({
  comment,
}: Readonly<{
  comment: CommentListItem;
}>) => {
  const { comments: tree, addComments } = useCommentsList();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<"no" | "yes" | "finished">("no");

  // If the parent comment has been loaded then this comment is rendered as an
  // (initially expanded) child, so we need its replies immediately
  const isRoot = tree.some((node) => node.comment._id === comment._id);

  useEffect(() => {
    if ((expanded || !isRoot) && loading === "no") {
      void (async () => {
        try {
          setLoading("yes");
          const replies = await rpc.comments.listReplies({
            commentId: comment._id,
          });
          addComments(replies);
          setLoading("finished");
        } catch (e) {
          captureException(e);
          console.error(e);
          toast.error("Error fetching replies to comment");
          setLoading("no");
        }
      })();
    }
  }, [addComments, comment._id, expanded, isRoot, loading]);

  const onToggleExpanded = useCallback(
    (expanded: boolean, node: CommentTreeNode<CommentListItem>) => {
      if (node.comment._id === comment._id) {
        setExpanded(expanded);
      }
    },
    [comment._id],
  );

  return tree.map((node) => {
    const isFeedComment = node.comment._id === comment._id;
    return (
      <CommentItem
        key={node.comment._id}
        node={node}
        showPreviewWhenCollapsed={isFeedComment}
        startCollapsed={isFeedComment}
        startRepliesCollapsed={isFeedComment}
        loadingReplies={isFeedComment && loading === "yes"}
        onToggleExpanded={onToggleExpanded}
        className="bg-comment-even!"
      />
    );
  });
};

/**
 * Each comment gets its own comments list so that its replies (and parent) can
 * be loaded and displayed as a tree.
 */
const CommentsFeedItemWithReplies = ({
  comment,
}: Readonly<{
  comment: CommentListItem;
}>) => {
  const showPostTitle = !!useOptionalCommentsList()?.showPostTitle;
  const comments = useMemo(() => [comment], [comment]);
  return (
    <CommentsListProvider comments={comments} showPostTitle={showPostTitle}>
      <CommentsFeedItemWithRepliesInner comment={comment} />
    </CommentsListProvider>
  );
};

/**
 * Unlike `CommentsList` which shows a tree of comments (for instance, underneath
 * a post), this component displays a flat list of comments with a button to
 * load more (more like a posts list).
 */
export default function CommentsFeed({
  comments,
  loadMore,
  loadRepliesOnExpand,
  className,
  listClassName,
}: Readonly<{
  comments: CommentListItem[];
  loadMore: (props: { offset: number; limit: number }) => Promise<CommentListItem[]>;
  /**
   * If true, expanding a comment will load and display its replies.
   */
  loadRepliesOnExpand?: boolean;
  className?: string;
  listClassName?: string;
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
      if (data.length) {
        setDisplayedComments((comments) => [...comments, ...data]);
      }
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
      <div className={listClassName}>
        {displayedComments.map((comment) =>
          loadRepliesOnExpand ? (
            <CommentsFeedItemWithReplies key={comment._id} comment={comment} />
          ) : (
            <CommentItem
              key={comment._id}
              node={{ comment, depth: 0, children: [], isLocal: false }}
              showPreviewWhenCollapsed
              startCollapsed
              className="bg-comment-even!"
            />
          ),
        )}
        {loading &&
          range(loadMoreLimit).map((i) => (
            <div key={i} className="w-full h-[80px] bg-gray-200 rounded mb-1" />
          ))}
      </div>
      {canLoadMore && (
        <TextLinkButton variant="primary" onClick={onLoadMore}>
          Load more
        </TextLinkButton>
      )}
    </section>
  );
}
