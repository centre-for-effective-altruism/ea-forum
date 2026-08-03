"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import {
  allPostsSettingsFromQuery,
  AllPostsTimeblockSettings,
  allPostsLimitsFromQuery,
} from "@/lib/posts/allPostsSettings";
import AllTimePostsList from "./AllTimePostsList";
import TimeframeList from "./TimeframeList";

export default function AllPostsList() {
  const { captureEvent } = useTracking();
  const searchParams = useSearchParams();

  const [settings, limits] = useMemo(() => {
    const rawSearchParams = Object.fromEntries(searchParams.entries());
    const settings = allPostsSettingsFromQuery(rawSearchParams);
    const limits = allPostsLimitsFromQuery(rawSearchParams);
    return [settings, limits];
  }, [searchParams]);

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
    <AnalyticsContext listContext="allPostsPage" terms={settings}>
      <section data-component="AllPostsList" className="max-w-full space-y-0.5">
        <Component
          settings={settings as AllPostsTimeblockSettings}
          limits={limits}
        />
      </section>
    </AnalyticsContext>
  );
}
