"use client";

import { useEffect } from "react";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import { useAllPosts } from "./AllPostsContext";
import type { AllPostsTimeblockSettings } from "@/lib/posts/allPostsSettings";
import AllTimePostsList from "./AllTimePostsList";
import TimeframeList from "./TimeframeList";

export default function AllPostsList() {
  const { captureEvent } = useTracking();
  const { settings, limits } = useAllPosts();

  useEffect(() => {
    captureEvent("allPostsSettingsMounted", {
      settings,
      before: limits.before?.toISOString() ?? null,
      after: limits.after?.toISOString() ?? null,
    });
  }, [captureEvent, settings, limits]);

  const Component =
    settings.timeframe === "allTime" ? AllTimePostsList : TimeframeList;

  return (
    <AnalyticsContext terms={settings}>
      <section data-component="AllPostsList" className="max-w-full space-y-0.5">
        <Component
          settings={settings as AllPostsTimeblockSettings}
          limits={limits}
        />
      </section>
    </AnalyticsContext>
  );
}
