"use client";

import { useLoadMore } from "@/lib/hooks/useLoadMore";
import { useQuickTakesListContext } from "./QuickTakesListContext";
import { rpc } from "@/lib/rpc";
import type { CommentListItem } from "@/lib/comments/commentLists";
import QuickTakesListSkeleton from "./QuickTakesListSkeleton";
import QuickTakeItem from "./QuickTakeItem";
import TextLinkButton from "../TextLinkButton";
import Type from "../Type";

export default function ClientRecentlyActiveQuickTakesList({
  quickTakes,
  className,
}: Readonly<{
  quickTakes: CommentListItem[];
  className?: string;
}>) {
  const { localQuickTakes } = useQuickTakesListContext();
  const { items, loading, limit, canLoadMore, onLoadMore } = useLoadMore({
    initialItems: quickTakes,
    fetchMore: (limit, offset) =>
      rpc.comments.listRecentlyActiveQuickTakes({ limit, offset }),
  });

  const quickTakesToDisplay = [...localQuickTakes, ...items];

  return (
    <section
      data-component="ClientRecentlyActiveQuickTakesList"
      className={className}
    >
      {quickTakesToDisplay.length === 0 && !loading && (
        <Type className="text-gray-600 text-center py-4">No quick takes yet.</Type>
      )}
      {quickTakesToDisplay.map((quickTake) => (
        <QuickTakeItem key={quickTake._id} quickTake={quickTake} />
      ))}
      {loading && <QuickTakesListSkeleton count={limit} />}
      {canLoadMore && (
        <TextLinkButton variant="primary" onClick={onLoadMore} disabled={loading}>
          Load more
        </TextLinkButton>
      )}
    </section>
  );
}
