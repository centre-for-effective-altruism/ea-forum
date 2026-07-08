"use client";

import { ReactNode, useCallback } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import {
  sequenceGetPageUrl,
  sequencePostCount,
  sequenceReadPostCount,
} from "@/lib/sequences/sequenceHelpers";
import { useSequencePosts } from "@/lib/hooks/useSequencePosts";
import { slugify } from "@/lib/slugs/slugify";
import type { SequenceBase } from "@/lib/sequences/sequenceQueries";
import SequenceOrCollectionCard from "./SequenceOrCollectionCard";
import SequenceTooltip from "../SequenceTooltip";

export default function SequenceCard({
  sequence,
}: Readonly<{
  sequence: SequenceBase;
}>) {
  const posts = useSequencePosts(sequence?._id);

  // Note: this is not a real slug, it's just so we can recognise the sequence
  // in the analytics, without risking any weirdness due to titles having spaces
  // in them.
  const slug = slugify(sequence?.title ?? "unknown-slug");

  const imageId =
    sequence.gridImageId ||
    sequence.bannerImageId ||
    "Banner/yeldubyolqpl3vqqy0m6.jpg";

  const TitleWrapper = useCallback(
    ({ children }: { children: ReactNode }) => {
      return (
        <SequenceTooltip
          sequence={sequence}
          sequencePosts={posts}
          placement="bottom"
        >
          {children}
        </SequenceTooltip>
      );
    },
    [sequence, posts],
  );
  return (
    <AnalyticsContext documentSlug={slug}>
      <SequenceOrCollectionCard
        title={sequence.title}
        author={sequence.user}
        TitleWrapper={TitleWrapper}
        postCount={sequencePostCount(sequence)}
        readCount={sequenceReadPostCount(posts.posts)}
        hideReadCount={posts.loading}
        imageId={imageId}
        href={sequenceGetPageUrl({ sequence })}
      />
    </AnalyticsContext>
  );
}
