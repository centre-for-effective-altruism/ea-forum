"use client";

import { useEffect } from "react";
import { useLoadMore } from "@/lib/hooks/useLoadMore";
import { useQuickTakesListContext } from "./QuickTakesListContext";
import { rpc } from "@/lib/rpc";
import type { CommentListItem } from "@/lib/comments/commentLists";
import QuickTakesListSkeleton from "./QuickTakesListSkeleton";
import QuickTakeItem from "./QuickTakeItem";
import Type from "../Type";

export default function QuickTakesList({
  quickTakes,
  totalCount,
  className,
}: Readonly<{
  quickTakes: CommentListItem[];
  totalCount: number;
  className?: string;
}>) {
  const { showCommunity, localQuickTakes } = useQuickTakesListContext();
  const withoutCommunityProps = useLoadMore({
    initialItems: quickTakes,
    initialTotalCount: totalCount,
    fetchMore: (limit, offset) =>
      rpc.comments.listQuickTakes({
        limit,
        offset,
        includeCommunity: false,
      }),
  });
  const withCommunityProps = useLoadMore({
    initialItems: [],
    limit: quickTakes.length,
    fetchMore: (limit, offset) =>
      rpc.comments.listQuickTakes({
        limit,
        offset,
        includeCommunity: true,
      }),
  });

  const {
    items,
    loading,
    limit,
    canLoadMore,
    onLoadMore,
    totalCount: currentTotalCount,
  } = showCommunity ? withCommunityProps : withoutCommunityProps;

  useEffect(() => {
    if (items.length === 0 && !loading && canLoadMore) {
      void onLoadMore();
    }
  }, [items, loading, canLoadMore, onLoadMore]);

  const quickTakesToDisplay = [...localQuickTakes, ...items];

  // Locally-posted quick takes aren't reflected in the server total yet, so add
  // them to both the shown and total counts to keep the ratio consistent.
  const shownCount = quickTakesToDisplay.length;
  const knownTotal =
    currentTotalCount != null ? currentTotalCount + localQuickTakes.length : null;

  return (
    <div data-component="QuickTakesList" className={className}>
      {quickTakesToDisplay.map((quickTake) => (
        <QuickTakeItem key={quickTake._id} quickTake={quickTake} />
      ))}
      {loading && <QuickTakesListSkeleton count={limit} />}
      {canLoadMore && (
        <Type
          onClick={onLoadMore}
          As="button"
          style="loadMore"
          disabled={loading}
          className="inline-block cursor-pointer text-primary hover:bg-primary/10 rounded px-2 py-1 -mx-2 -my-1 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
        >
          Load more
          {knownTotal != null ? ` (${shownCount}/${knownTotal})` : ""}
        </Type>
      )}
    </div>
  );
}
