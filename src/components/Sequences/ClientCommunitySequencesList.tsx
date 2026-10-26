"use client";

import { useLoadMore } from "@/lib/hooks/useLoadMore";
import { rpc } from "@/lib/rpc";
import type { SequenceBase } from "@/lib/sequences/sequenceQueries";
import SequenceCard from "../FeaturedCards/SequenceCard";
import SequencesGridSkeleton from "./SequencesGridSkeleton";
import TextLinkButton from "../TextLinkButton";
import Type from "../Type";

export default function ClientCommunitySequencesList({
  sequences,
}: Readonly<{
  sequences: SequenceBase[];
}>) {
  const { items, loading, limit, canLoadMore, onLoadMore } = useLoadMore({
    initialItems: sequences,
    fetchMore: (limit, offset) =>
      rpc.sequences.listCommunitySequences({ limit, offset }),
  });
  return (
    <section data-component="ClientCommunitySequencesList">
      {items.length === 0 && !loading && (
        <Type className="text-gray-600 italic">No sequences to display.</Type>
      )}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {items.map((sequence) => (
          <SequenceCard key={sequence._id} sequence={sequence} />
        ))}
      </div>
      {loading && (
        <div className="mt-4">
          <SequencesGridSkeleton count={limit} />
        </div>
      )}
      {canLoadMore && (
        <TextLinkButton
          variant="primary"
          onClick={onLoadMore}
          disabled={loading}
          className="mt-4"
        >
          Load more
        </TextLinkButton>
      )}
    </section>
  );
}
