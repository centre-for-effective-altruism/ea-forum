"use client";

import { ReactNode, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { topicPageTabSchema, type TopicPageTab } from "@/lib/tags/topicPageParams";
import { useTracking } from "@/lib/analyticsEvents";
import clsx from "clsx";
import Type from "../Type";

const tabLabels: Record<TopicPageTab, string> = {
  posts: "Posts",
  wiki: "Wiki",
};

const tabs = topicPageTabSchema.unwrap().options;

export default function TopicTabs({
  actions,
  panels,
  sidebars,
}: Readonly<{
  actions: ReactNode;
  panels: Record<TopicPageTab, ReactNode>;
  sidebars: Record<TopicPageTab, ReactNode>;
}>) {
  const { captureEvent } = useTracking();
  const searchParams = useSearchParams();
  const currentTab = topicPageTabSchema.parse(searchParams.get("tab") ?? undefined);

  const onSelectTab = useCallback(
    (tab: TopicPageTab) => {
      captureEvent("topicTabClicked", { tab });
      const params = new URLSearchParams(searchParams);
      if (tab === "posts") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`,
      );
    },
    [captureEvent, searchParams],
  );

  return (
    <div data-component="TopicTabs">
      <div className="border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-4 flex items-center gap-2">
          <div role="tablist" aria-label="Topic sections" className="flex grow">
            {tabs.map((tab) => (
              <button
                key={tab}
                role="tab"
                id={`topic-tab-${tab}`}
                aria-selected={tab === currentTab}
                aria-controls={`topic-panel-${tab}`}
                onClick={onSelectTab.bind(null, tab)}
                className={clsx(
                  "cursor-pointer px-3 py-4 -mb-px border-b-2",
                  tab === currentTab
                    ? "border-primary text-gray-1000"
                    : "border-transparent text-gray-600 hover:text-gray-1000",
                )}
              >
                <Type style="bodyLarge">{tabLabels[tab]}</Type>
              </button>
            ))}
          </div>
          {actions}
        </div>
      </div>
      <div
        className="
          max-w-[1100px] mx-auto px-4 pt-6
          flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_300px] gap-10
        "
      >
        {tabs.map((tab) => (
          <div
            key={tab}
            role="tabpanel"
            id={`topic-panel-${tab}`}
            aria-labelledby={`topic-tab-${tab}`}
            className={clsx("min-w-0", tab !== currentTab && "hidden")}
          >
            {panels[tab]}
          </div>
        ))}
        {tabs.map((tab) => (
          <aside key={tab} className={clsx(tab !== currentTab && "hidden")}>
            {sidebars[tab]}
          </aside>
        ))}
      </div>
    </div>
  );
}
