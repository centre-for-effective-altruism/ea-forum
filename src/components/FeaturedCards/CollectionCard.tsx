"use client";

import { ReactNode, useCallback } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import {
  collectionGetPageUrl,
  collectionReadPostCount,
  getCollectionCardDetails,
} from "@/lib/collections/collectionHelpers";
import { useCollectionPosts } from "@/lib/hooks/useCollectionPosts";
import type { CollectionBase } from "@/lib/collections/collectionQueries";
import SequenceOrCollectionCard from "./SequenceOrCollectionCard";
import CollectionsTooltip from "../CollectionsTooltip";

export default function CollectionCard({
  collection,
}: Readonly<{
  collection: CollectionBase;
}>) {
  const posts = useCollectionPosts(collection._id);
  const { title, author, imageId } = getCollectionCardDetails(collection);

  const TitleWrapper = useCallback(
    ({ children }: { children: ReactNode }) => {
      return (
        <CollectionsTooltip collection={collection} collectionPosts={posts}>
          {children}
        </CollectionsTooltip>
      );
    },
    [collection, posts],
  );
  return (
    <AnalyticsContext documentSlug={collection.slug}>
      <SequenceOrCollectionCard
        title={title}
        author={author}
        TitleWrapper={TitleWrapper}
        postCount={posts.posts.length}
        readCount={collectionReadPostCount(posts.posts)}
        hideReadCount={posts.loading}
        imageId={imageId}
        href={collectionGetPageUrl({ collection })}
      />
    </AnalyticsContext>
  );
}
