"use client";

import { useCallback, useEffect, useState } from "react";
import { useTracking } from "@/lib/analyticsEvents";
import {
  AllPostsTimeblockSettings,
  getInitialBlockCount,
  getTimeblockDateRanges,
  loadMoreTimeframeStrings,
} from "@/lib/posts/allPostsSettings";
import PostTimeblock from "./PostTimeblock";
import Button from "../Button";

export default function TimeframeList({
  settings,
}: Readonly<{
  settings: AllPostsTimeblockSettings;
}>) {
  const { captureEvent } = useTracking();
  const [ranges, setRanges] = useState<{ after: Date; before: Date }[]>([]);

  useEffect(() => {
    setRanges(getTimeblockDateRanges(settings.timeframe));
  }, [settings.timeframe]);

  const loadMore = useCallback(() => {
    const newNumBlocks = ranges.length + getInitialBlockCount(settings.timeframe);
    setRanges(getTimeblockDateRanges(settings.timeframe, newNumBlocks));
    captureEvent("loadMoreTimeframes", {
      settings,
      newNumBlocks,
    });
  }, [captureEvent, settings, ranges.length]);

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
      <div>
        <Button onClick={loadMore}>
          Load more {loadMoreTimeframeStrings[settings.timeframe]}
        </Button>
      </div>
    </div>
  );
}
