"use client";

import { useCallback, useState } from "react";
import type { RecentDiscussionPost } from "@/lib/recentDiscussions/fetchRecentDiscussions";
import type { CommentsList } from "@/lib/comments/commentLists";
import { useRecordPostView } from "@/lib/hooks/useRecordPostView";
import { commentsToCommentTree } from "@/lib/comments/CommentTree";

export const useRecentDiscussionThread = ({
  post,
  comments,
  initialExpandAllThreads,
}: {
  post: RecentDiscussionPost;
  comments?: CommentsList[];
  initialExpandAllThreads?: boolean;
}) => {
  const [highlightVisible, setHighlightVisible] = useState(false);
  const [markedAsVisitedAt, setMarkedAsVisitedAt] = useState<Date | null>(null);
  const [expandAllThreads, setExpandAllThreads] = useState(
    initialExpandAllThreads ?? false,
  );
  const { recordPostView, recordPostCommentsView } = useRecordPostView(post);

  const markAsRead = useCallback(() => {
    setMarkedAsVisitedAt(new Date());
    setExpandAllThreads(true);
    void recordPostView({
      post,
      extraEventProperties: { type: "recentDiscussionClick" },
    });
  }, [setMarkedAsVisitedAt, setExpandAllThreads, recordPostView, post]);
  const showHighlight = useCallback(() => {
    setHighlightVisible(!highlightVisible);
    markAsRead();
  }, [setHighlightVisible, highlightVisible, markAsRead]);

  const markCommentsAsRead = useCallback(() => {
    // This is meant to be passed to e.g. an event listener (currently only
    // use is with `onMouseUp`). The setTimeout punts running this until the
    // rest of event listeners triggered by same event are done. Necessary
    // to avoid causing the child components those event listeners are on
    // from rerendering before the event listeners run.
    setTimeout(() => {
      setMarkedAsVisitedAt(new Date());
      void recordPostCommentsView(post._id);
    }, 0);
  }, [recordPostCommentsView, post]);

  const nestedComments = commentsToCommentTree<CommentsList>(comments ?? []);
  const lastVisitedAt = markedAsVisitedAt || post.readStatus?.[0]?.lastUpdated;

  // For posts that have never been commented on, we do want to show them in the
  // recent discussion feed. For posts which have been commented on, but the
  // comments have been deleted, we don't want to show them (these are usually
  // spam).
  //
  // There is no completely reliable way to tell the difference, but this is a
  // fairly conservative (in favour of showing a post) heuristic.
  const probablyNeverCommentedOn =
    new Date(post.lastCommentedAt ?? 0).getTime() -
      new Date(post.postedAt).getTime() <
    30_000;

  // New posts should render (to display their highlight).
  // Posts with at least one comment should only render if those comments
  // meet the frontpage filter requirements
  const isSkippable = comments && !comments.length && !probablyNeverCommentedOn;

  return {
    isSkippable,
    showHighlight,
    markCommentsAsRead,
    expandAllThreads,
    lastVisitedAt,
    nestedComments,
  };
};
