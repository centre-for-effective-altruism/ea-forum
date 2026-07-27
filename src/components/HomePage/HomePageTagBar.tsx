"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TagBase } from "@/lib/tags/tagQueries";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import { sortedHomePageTags } from "@/lib/tags/homepageTags";
import { useHomePageData } from "./HomePageDataContext";
import clsx from "clsx";
import Type from "../Type";
import "./home-page-tag-bar.css";

/**
 * A horizontal bar of clickable tabs that can be used to filter content by tag.
 * TODO: This needs to support special tags for forum events
 */
export default function HomePageTagBar({
  coreTags,
  className,
}: Readonly<{
  coreTags: TagBase[];
  className?: string;
}>) {
  const tabsWindowRef = useRef<HTMLDivElement>(null);
  const topicsBarRef = useRef<HTMLDivElement>(null);
  const { currentTag, setCurrentTag } = useHomePageData();
  const [canScrollToLeft, setCanScrollToLeft] = useState(false);
  const [canScrollToRight, setCanScrollToRight] = useState(true);
  const { captureEvent } = useTracking();

  // We store the topic bar scrollLeft offsets that correspond to displaying
  // each "set" of topics. We calculate the offsets in the useEffect below.
  const offsets = useRef<number[]>([0]);
  useEffect(() => {
    if (!tabsWindowRef.current || !topicsBarRef.current) {
      return;
    }
    offsets.current = [0];
    const offsetWidth = tabsWindowRef.current.offsetWidth;
    const buttons = Array.from(topicsBarRef.current.children) as HTMLElement[];
    for (const button of buttons) {
      // We are looking for the topic that would get cut off at the end of each
      // "set" by checking if the right edge would be past the window - if so,
      // this will be the first in the next "set"
      const previousOffset = offsets.current[offsets.current.length - 1];
      if (button.offsetLeft + button.offsetWidth - previousOffset > offsetWidth) {
        // Subtract 30px to account for the fade on the left side of the tabs window
        offsets.current.push(button.offsetLeft - 30);
      }
    }
  }, [tabsWindowRef, topicsBarRef]);

  const sortedTags = useMemo(
    () => [null, ...sortedHomePageTags(coreTags)],
    [coreTags],
  );

  const onScroll = useCallback(() => {
    if (!tabsWindowRef.current || !topicsBarRef.current) {
      return;
    }

    const currentScrollLeft = tabsWindowRef.current.scrollLeft;
    const containerWidth = topicsBarRef.current.scrollWidth;
    const actualWidth = tabsWindowRef.current.clientWidth;
    // Max amount we can scroll to the right, reduced a bit to make sure that
    // we hide the right arrow when scrolled all the way to the right
    const maxScrollLeft = containerWidth - actualWidth - 10;

    setCanScrollToLeft(currentScrollLeft > 0);
    setCanScrollToRight(currentScrollLeft < maxScrollLeft);
  }, []);

  const onClick = useCallback(
    (tag: TagBase | null) => {
      setCurrentTag(tag);
      captureEvent("topicsBarTabClicked", {
        topicsBarTabId: tag ? tag._id : "0",
        topicsBarTabName: tag ? tag.shortName || tag.name : "Frontpage",
      });
    },
    [setCurrentTag, captureEvent],
  );

  return (
    <AnalyticsContext pageSectionContext="topicsBar">
      <section
        data-component="HomePageTagBar"
        className={clsx("relative max-w-full", className)}
      >
        <div
          className={clsx(
            "relative",
            canScrollToLeft && "home-page-tag-bar-fade-left",
            canScrollToRight && "home-page-tag-bar-fade-right",
          )}
        >
          <div
            ref={tabsWindowRef}
            onScroll={onScroll}
            className="overflow-x-scroll no-scrollbars max-w-full"
          >
            <div ref={topicsBarRef} className="flex gap-2">
              {sortedTags.map((tag) => (
                <button
                  key={tag?._id ?? "all"}
                  onClick={onClick.bind(null, tag)}
                  className={clsx(
                    "cursor-pointer rounded whitespace-nowrap px-2 py-1",
                    tag === currentTag
                      ? "bg-gray-1000 text-gray-0"
                      : "bg-gray-200 text-gray-900 hover:bg-gray-300",
                  )}
                >
                  <Type className="max-md:text-[12px]">
                    {tag ? tag.shortName || tag.name : "All"}
                  </Type>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AnalyticsContext>
  );
}
