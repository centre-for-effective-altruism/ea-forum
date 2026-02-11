"use client";

import { useEffect } from "react";
import { useLoadMore } from "@/lib/hooks/useLoadMore";
import { useQuickTakesListContext } from "./QuickTakesListContext";
import { rpc } from "@/lib/rpc";
import type { CommentsList } from "@/lib/comments/commentLists";
import QuickTakesListSkeleton from "./QuickTakesListSkeleton";
import QuickTakeItem from "./QuickTakeItem";
import Type from "../Type";

export default function QuickTakesList({
  quickTakes,
  className,
}: Readonly<{
  quickTakes: CommentsList[];
  className?: string;
}>) {
  const { showCommunity, localQuickTakes } = useQuickTakesListContext();
  const withoutCommunityProps = useLoadMore({
    initialItems: quickTakes,
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

  const { items, loading, limit, canLoadMore, onLoadMore } = showCommunity
    ? withCommunityProps
    : withoutCommunityProps;

  useEffect(() => {
    if (items.length === 0 && !loading && canLoadMore) {
      void onLoadMore();
    }
  }, [items, loading, canLoadMore, onLoadMore]);

  const quickTakesToDisplay = [...localQuickTakes, ...items];

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
          className="cursor-pointer text-primary hover:opacity-70"
        >
          Load more
        </Type>
      )}
    </div>
  );
}
