"use client";

import { useEffect, useState } from "react";
import {
  AllPostsTimeblockSettings,
  getTimeblockDateRanges,
} from "@/lib/posts/allPostsSettings";
import PostTimeblock from "./PostTimeblock";

export default function TimeframeList({
  settings,
}: Readonly<{
  settings: AllPostsTimeblockSettings;
}>) {
  const [ranges, setRanges] = useState<{ after: Date; before: Date }[]>([]);

  useEffect(() => {
    setRanges(getTimeblockDateRanges(settings.timeframe));
  }, [settings.timeframe]);

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
    </div>
  );
}
