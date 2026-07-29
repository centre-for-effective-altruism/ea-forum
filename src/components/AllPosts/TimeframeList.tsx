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
  const [ranges, setRanges] = useState(() =>
    getTimeblockDateRanges(settings.timeframe),
  );

  useEffect(() => {
    setRanges(getTimeblockDateRanges(settings.timeframe));
  }, [settings]);

  return (
    <div data-component="TimeframeList" className="flex flex-col gap-4">
      {ranges.map((range, i) => (
        <PostTimeblock key={i} settings={settings} {...range} />
      ))}
    </div>
  );
}
