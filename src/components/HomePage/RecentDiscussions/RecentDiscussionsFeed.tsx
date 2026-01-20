"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import type {
  RecentDiscussionRevision,
  RecentDiscussionsData,
} from "@/lib/recentDiscussions/fetchRecentDiscussions";
import { getRecentDiscussionsAction } from "@/lib/recentDiscussions/recentDiscussionsActions";
import InfiniteLoadTrigger from "@/components/InfiniteLoadTrigger";
import RecentDiscussionsItemSkeleton from "./RecentDiscussionsItemSkeleton";
import RecentDiscussionsPostCommented from "./RecentDiscussionsPostCommented";
import RecentDiscussionsTagRevised from "./RecentDiscussionsTagRevised";

export default function RecentDiscussionsFeed({
  data,
}: Readonly<{
  data: RecentDiscussionsData;
}>) {
  const [displayedData, setDisplayedData] = useState(data);
  const [loading, setLoading] = useState(false);
  const limit = data.results.length || 10;

  const onLoadMore = useCallback(async () => {
    if (loading) {
      return;
    }
    try {
      setLoading(true);
      const cutoff = displayedData.cutoff
        ? new Date(displayedData.cutoff)
        : undefined;
      const response = await getRecentDiscussionsAction({
        limit,
        cutoff,
        offset: displayedData.endOffset,
      });
      setDisplayedData({
        ...response,
        results: [...displayedData.results, ...response.results],
      });
    } catch (error) {
      console.error("Error loading recent discussions:", error);
      captureException(error);
    } finally {
      setLoading(false);
    }
  }, [displayedData, loading, limit]);

  return (
    <div>
      {displayedData.results.map(({ type, sortKey, item }) => {
        const key = type + sortKey;
        switch (type) {
          case "postCommented":
            return <RecentDiscussionsPostCommented post={item} key={key} />;
          case "newQuickTake":
          // TODO
          case "quickTakeCommented":
          // TODO
          case "tagDiscussed":
          // TODO
          case "tagRevised":
            return (
              <RecentDiscussionsTagRevised
                revision={item as RecentDiscussionRevision}
                key={key}
              />
            );
          case "subscribeReminder":
          // TODO
          default:
            console.warn("Invalid recent discussions item type:", type);
            return null;
        }
      })}
      {loading && (
        <>
          {new Array(10).fill(null).map((_, i) => (
            <RecentDiscussionsItemSkeleton key={i} />
          ))}
        </>
      )}
      <InfiniteLoadTrigger onTrigger={onLoadMore} />
    </div>
  );
}
