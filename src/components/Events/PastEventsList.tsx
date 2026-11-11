"use client";

import { useCallback, useEffect, useState } from "react";
import { useTracking } from "@/lib/analyticsEvents";
import {
  getInitialBlockCount,
  getTimeblockDateRanges,
  loadMoreTimeframeStrings,
} from "@/lib/posts/allPostsSettings";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import PastEventsTimeblock from "./PastEventsTimeblock";
import Button from "../Button";

export default function PastEventsList() {
  const { captureEvent } = useTracking();
  const [ranges, setRanges] = useState<{ after: Date; before: Date }[]>([]);

  useEffect(() => {
    setRanges(getTimeblockDateRanges({ timeframe: "daily" }));
  }, []);

  const loadMore = useCallback(() => {
    const newNumBlocks = ranges.length + getInitialBlockCount("daily");
    setRanges(
      getTimeblockDateRanges({ timeframe: "daily", numBlocks: newNumBlocks }),
    );
    captureEvent("loadMoreTimeframes", { newNumBlocks });
  }, [captureEvent, ranges.length]);

  if (!ranges.length) {
    return <PostsListSkeleton count={10} />;
  }

  return (
    <div data-component="PastEventsList" className="flex flex-col gap-8">
      {ranges.map(({ before, after }) => (
        <PastEventsTimeblock
          key={`${before.toISOString()}-${after.toISOString()}`}
          before={before}
          after={after}
        />
      ))}
      <div>
        <Button onClick={loadMore}>
          Load more {loadMoreTimeframeStrings.daily}
        </Button>
      </div>
    </div>
  );
}
