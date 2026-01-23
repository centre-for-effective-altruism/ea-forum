"use client";

import { useCallback, useState } from "react";
import { fetchQuickTakesAction } from "@/lib/comments/commentActions";
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
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(quickTakes.length);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [displayedQuickTakes, setDisplayedQuickTakes] = useState(quickTakes);
  const limit = quickTakes.length;

  const onLoadMore = useCallback(async () => {
    const offset_ = offset;
    setOffset((offset) => offset + limit);
    setLoading(true);

    try {
      const { data = [] } = await fetchQuickTakesAction({ limit, offset: offset_ });
      setDisplayedQuickTakes((quickTakes) => [...quickTakes, ...data]);
      if (data.length < limit) {
        setCanLoadMore(false);
      }
    } catch (e) {
      console.error("Error fetching quick takes:", e);
    } finally {
      setLoading(false);
    }
  }, [offset, limit]);

  return (
    <div data-component="QuickTakesList" className={className}>
      {displayedQuickTakes.map((quickTake) => (
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
