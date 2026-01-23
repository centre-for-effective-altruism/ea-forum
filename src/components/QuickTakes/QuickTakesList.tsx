"use client";

import { useEffect } from "react";
import { useLoadMore } from "@/lib/hooks/useLoadMore";
import { fetchQuickTakesAction } from "@/lib/comments/commentActions";
import { useQuickTakesCommunityContext } from "./QuickTakesCommunityContext";
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
  const { showCommunity } = useQuickTakesCommunityContext();
  const withoutCommunityProps = useLoadMore({
    initialItems: quickTakes,
    fetchMore: async (limit, offset) => {
      const { data = [] } = await fetchQuickTakesAction({
        limit,
        offset,
        includeCommunity: false,
      });
      return data;
    },
  });
  const withCommunityProps = useLoadMore({
    initialItems: [],
    limit: quickTakes.length,
    fetchMore: async (limit, offset) => {
      const { data = [] } = await fetchQuickTakesAction({
        limit,
        offset,
        includeCommunity: true,
      });
      return data;
    },
  });

  const { items, loading, limit, canLoadMore, onLoadMore } = showCommunity
    ? withCommunityProps
    : withoutCommunityProps;

  useEffect(() => {
    if (items.length === 0 && !loading && canLoadMore) {
      void onLoadMore();
    }
  }, [items, loading, canLoadMore, onLoadMore]);

  return (
    <div data-component="QuickTakesList" className={className}>
      {items.map((quickTake) => (
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
