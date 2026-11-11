"use client";

import { useCallback, useEffect, useState } from "react";
import range from "lodash/range";
import { useTracking } from "@/lib/analyticsEvents";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import PastEventsWindow from "./PastEventsWindow";
import Button from "../Button";

const monthsPerWindow = 3;

const getWindowEnd = (tomorrow: Date, index: number) => {
  const end = new Date(tomorrow);
  end.setMonth(end.getMonth() - index * monthsPerWindow);
  return end;
};

const getWindow = (tomorrow: Date, index: number) => ({
  before: getWindowEnd(tomorrow, index),
  after: getWindowEnd(tomorrow, index + 1),
});

export default function PastEventsList() {
  const { captureEvent } = useTracking();
  const [tomorrow, setTomorrow] = useState<Date | null>(null);
  const [windowCount, setWindowCount] = useState(1);

  useEffect(() => {
    const startOfTomorrow = new Date();
    startOfTomorrow.setHours(24, 0, 0, 0);
    setTomorrow(startOfTomorrow);
  }, []);

  const loadMore = useCallback(() => {
    const newWindowCount = windowCount + 1;
    setWindowCount(newWindowCount);
    captureEvent("loadMorePastEvents", { windowCount: newWindowCount });
  }, [captureEvent, windowCount]);

  if (!tomorrow) {
    return <PostsListSkeleton count={10} />;
  }

  return (
    <div data-component="PastEventsList" className="flex flex-col gap-8">
      {range(windowCount).map((index) => {
        const { before, after } = getWindow(tomorrow, index);
        return (
          <PastEventsWindow
            key={before.toISOString()}
            before={before}
            after={after}
          />
        );
      })}
      <div>
        <Button onClick={loadMore}>Load older events</Button>
      </div>
    </div>
  );
}
