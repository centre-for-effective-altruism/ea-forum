"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CoreTag } from "@/lib/tags/tagQueries";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import { sortedHomePageTags } from "@/lib/tags/homepageTags";
import qs from "querystring";
import clsx from "clsx";
import Type from "../Type";
import ThickChevronLeftIcon from "../Icons/ThickChevronLeftIcon";
import ThickChevronRightIcon from "../Icons/ThickChevronRightIcon";
import "./home-page-tag-bar.css";

/**
 * A horizontal bar of clickable tabs that can be used to filter content by tag.
 * TODO: This needs to support special tags for forum events
 */
export default function HomePageTagBarDisplay({
  coreTags,
  className,
}: Readonly<{
  coreTags: CoreTag[];
  className?: string;
}>) {
  const tabsWindowRef = useRef<HTMLDivElement>(null);
  const topicsBarRef = useRef<HTMLDivElement>(null);
  // The currently selected tag, or null for the frontpage
  const [activeTag, setActiveTag] = useState<CoreTag | null>(null);
  const [leftArrowVisible, setLeftArrowVisible] = useState(false);
  const [rightArrowVisible, setRightArrowVisible] = useState(true);
  const { captureEvent } = useTracking();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  // Set the initial active tab based on the query and update the tab if the
  // user clicks on a new one
  useEffect(() => {
    if (!coreTags.length) {
      return;
    }
    const queryTab = searchParams.get("tab");
    const activeTab = queryTab
      ? coreTags.find((tag) => tag.slug === queryTab)
      : null;
    if (activeTab) {
      setActiveTag(activeTab);
      return;
    }
    setActiveTag(null);
  }, [coreTags, searchParams]);

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

    setLeftArrowVisible(currentScrollLeft > 0);
    setRightArrowVisible(currentScrollLeft < maxScrollLeft);
  }, []);

  const onScrollLeft = useCallback(() => {
    if (!tabsWindowRef.current || !topicsBarRef.current) {
      return;
    }
    // Look for the offset that is to the left of us
    const nextOffset =
      Array.from(offsets.current)
        .reverse()
        .find((os) => {
          return os < tabsWindowRef.current!.scrollLeft - 2;
        }) || 0;
    tabsWindowRef.current.scrollTo({
      left: nextOffset,
      behavior: "smooth",
    });
    setRightArrowVisible(true);
  }, [offsets]);

  const onScrollRight = useCallback(() => {
    if (!tabsWindowRef.current || !topicsBarRef.current) {
      return;
    }
    // Look for the offset that is to the right of us
    const nextOffset = offsets.current.find((os) => {
      return os > tabsWindowRef.current!.scrollLeft;
    });
    if (nextOffset) {
      tabsWindowRef.current.scrollTo({
        left: nextOffset,
        behavior: "smooth",
      });
      setLeftArrowVisible(true);
    }
  }, [offsets]);

  const onClick = useCallback(
    (tag: CoreTag | null) => {
      setActiveTag(tag);
      const query = Object.fromEntries(searchParams.entries());
      if (tag) {
        query.tab = tag.slug;
      } else {
        delete query.tab;
      }
      router.replace(`${pathname}?${qs.stringify(query)}`);
      captureEvent("topicsBarTabClicked", {
        topicsBarTabId: tag ? tag._id : "0",
        topicsBarTabName: tag ? tag.shortName || tag.name : "Frontpage",
      });
    },
    [router, pathname, searchParams, captureEvent],
  );

  return (
    <AnalyticsContext pageSectionContext="topicsBar">
      <section
        data-component="HomePageTagBar"
        className={clsx("relative max-w-full", className)}
      >
        {leftArrowVisible && (
          <div
            onClick={onScrollLeft}
            role="button"
            className={clsx("home-page-tag-bar-arrow", "left-[-30px]")}
          >
            <ThickChevronLeftIcon className="font-[18px]" />
          </div>
        )}
        <div
          className={clsx(
            "relative",
            leftArrowVisible && "home-page-tag-bar-fade-left",
            rightArrowVisible && "home-page-tag-bar-fade-right",
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
                  key={tag?._id ?? "frontpage"}
                  onClick={onClick.bind(null, tag)}
                  className={clsx(
                    "cursor-pointer rounded whitespace-nowrap px-2 py-1",
                    tag === activeTag
                      ? "bg-gray-1000 text-gray-0"
                      : "bg-gray-200 text-gray-900 hover:bg-gray-300",
                  )}
                >
                  <Type>{tag ? tag.shortName || tag.name : "Frontpage"}</Type>
                </button>
              ))}
            </div>
          </div>
        </div>
        {rightArrowVisible && (
          <div
            onClick={onScrollRight}
            role="button"
            className={clsx("home-page-tag-bar-arrow", "right-[-30px]")}
          >
            <ThickChevronRightIcon className="font-[18px]" />
          </div>
        )}
      </section>
    </AnalyticsContext>
  );
}
