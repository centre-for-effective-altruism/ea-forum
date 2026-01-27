"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import type { RecentDiscussionsData } from "@/lib/recentDiscussions/fetchRecentDiscussions";
import { fetchRecentDiscussionsAction } from "@/lib/recentDiscussions/recentDiscussionsActions";
import InfiniteLoadTrigger from "@/components/InfiniteLoadTrigger";
import RecentDiscussionsItemSkeleton from "./RecentDiscussionsItemSkeleton";
import RecentDiscussionsPostCommented from "./RecentDiscussionsPostCommented";
import RecentDiscussionsNewQuickTake from "./RecentDiscussionsNewQuickTake";
import RecentDiscussionsQuickTakeCommented from "./RecentDiscussionsQuickTakeCommented";
import RecentDiscussionsTagRevised from "./RecentDiscussionsTagRevised";
import RecentDiscussionsSubscribeReminder from "./RecentDiscussionsSubscribeReminder";
import RecentDiscussionsTagDiscussed from "./RecentDiscussionsTagDiscussed";

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
      const { data: response } = await fetchRecentDiscussionsAction({
        limit,
        cutoff,
        offset: displayedData.endOffset,
      });
      if (response) {
        setDisplayedData({
          ...response,
          results: [...displayedData.results, ...response.results],
        });
      }
    } catch (error) {
      console.error("Error loading recent discussions:", error);
      captureException(error);
    } finally {
      setLoading(false);
    }
  }, [displayedData, loading, limit]);

  return (
    <div data-component="RecentDiscussionsFeed">
      {displayedData.results.map(({ type, sortKey, item }) => {
        const key = type + sortKey;
        switch (type) {
          case "postCommented":
            return <RecentDiscussionsPostCommented post={item} key={key} />;
          case "newQuickTake":
            return <RecentDiscussionsNewQuickTake quickTake={item} key={key} />;
          case "quickTakeCommented":
            return <RecentDiscussionsQuickTakeCommented post={item} key={key} />;
          case "tagDiscussed":
            return <RecentDiscussionsTagDiscussed tag={item} key={key} />;
          case "tagRevised":
            return <RecentDiscussionsTagRevised revision={item} key={key} />;
          case "subscribeReminder":
            return <RecentDiscussionsSubscribeReminder key={key} />;
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
