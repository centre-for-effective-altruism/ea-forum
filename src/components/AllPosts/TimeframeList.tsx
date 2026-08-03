"use client";

import { useCallback, useEffect, useState } from "react";
import { useTracking } from "@/lib/analyticsEvents";
import {
  AllPostsLimits,
  AllPostsTimeblockSettings,
  getInitialBlockCount,
  getTimeblockDateRanges,
  loadMoreTimeframeStrings,
} from "@/lib/posts/allPostsSettings";
import PostTimeblock from "./PostTimeblock";
import Button from "../Button";

export default function TimeframeList({
  settings,
  limits,
}: Readonly<{
  settings: AllPostsTimeblockSettings;
  limits?: AllPostsLimits;
}>) {
  const { captureEvent } = useTracking();
  const [ranges, setRanges] = useState<{ after: Date; before: Date }[]>([]);

  useEffect(() => {
    setRanges(
      getTimeblockDateRanges({
        timeframe: settings.timeframe,
        limits,
      }),
    );
  }, [settings.timeframe, limits]);

  const loadMore = useCallback(() => {
    const newNumBlocks = ranges.length + getInitialBlockCount(settings.timeframe);
    setRanges(
      getTimeblockDateRanges({
        timeframe: settings.timeframe,
        limits,
        numBlocks: newNumBlocks,
      }),
    );
    captureEvent("loadMoreTimeframes", {
      settings,
      newNumBlocks,
    });
  }, [captureEvent, settings, limits, ranges.length]);

  const hideLoadMore = !!limits?.after || !!limits?.before;

  return (
    <div data-component="TimeframeList" className="flex flex-col gap-8">
      {ranges.map(({ before, after }) => (
        <PostTimeblock
          key={`${before.toISOString()}-${after.toISOString()}`}
          settings={settings}
          before={before}
          after={after}
        />
      ))}
      {!hideLoadMore && (
        <div>
          <Button onClick={loadMore}>
            Load more {loadMoreTimeframeStrings[settings.timeframe]}
          </Button>
        </div>
      )}
    </div>
  );
}
