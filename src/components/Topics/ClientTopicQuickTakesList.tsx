"use client";

import { useLoadMore } from "@/lib/hooks/useLoadMore";
import { rpc } from "@/lib/rpc";
import type { CommentListItem } from "@/lib/comments/commentLists";
import QuickTakesListSkeleton from "../QuickTakes/QuickTakesListSkeleton";
import QuickTakeItem from "../QuickTakes/QuickTakeItem";
import TextLinkButton from "../TextLinkButton";

const ITEMS_PER_PAGE = 20;

export default function ClientTopicQuickTakesList({
  tagId,
  quickTakes,
  totalCount: initialTotalCount,
}: Readonly<{
  tagId: string;
  quickTakes: CommentListItem[];
  totalCount: number;
}>) {
  const { items, loading, limit, canLoadMore, onLoadMore, totalCount } = useLoadMore(
    {
      initialItems: quickTakes,
      initialTotalCount,
      limit: ITEMS_PER_PAGE,
      fetchMore: (limit, offset) =>
        rpc.comments.listTagQuickTakes({ tagId, limit, offset }),
    },
  );

  return (
    <section data-component="ClientTopicQuickTakesList">
      {items.map((quickTake) => (
        <QuickTakeItem key={quickTake._id} quickTake={quickTake} />
      ))}
      {loading && <QuickTakesListSkeleton count={limit} />}
      {canLoadMore && (
        <TextLinkButton variant="primary" onClick={onLoadMore} disabled={loading}>
          Load more
          {totalCount != null ? ` (${items.length}/${totalCount})` : ""}
        </TextLinkButton>
      )}
    </section>
  );
}
