"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SearchContentType,
  searchContentTypes,
  searchTabs,
} from "@/lib/search/searchPageParams";
import { useSearchPage } from "./useSearchPage";
import clsx from "clsx";
import Type from "../../Type";

type IndicatorPosition = {
  left: number;
  width: number;
};

export default function SearchPageTabs() {
  const { state, setContentType } = useSearchPage();
  const tabRefs = useRef<Partial<Record<SearchContentType, HTMLButtonElement>>>({});
  const tabListRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<IndicatorPosition | null>(null);
  const [animateIndicator, setAnimateIndicator] = useState(false);

  useEffect(() => {
    const tabList = tabListRef.current;
    const activeTab = tabRefs.current[state.contentType];
    if (!tabList || !activeTab) {
      return;
    }
    const updateIndicator = () =>
      setIndicator({ left: activeTab.offsetLeft, width: activeTab.offsetWidth });
    updateIndicator();
    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(tabList);
    resizeObserver.observe(activeTab);
    return () => resizeObserver.disconnect();
  }, [state.contentType]);

  const onSelectTab = useCallback(
    (contentType: SearchContentType) => {
      if (contentType !== state.contentType) {
        setAnimateIndicator(true);
        setContentType(contentType);
      }
    },
    [state.contentType, setContentType],
  );

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label="Search content types"
      data-component="SearchPageTabs"
      className="
        relative flex max-w-[720px] border-b border-gray-200 mb-6 overflow-x-auto
      "
    >
      {searchContentTypes.map((contentType) => (
        <button
          key={contentType}
          ref={(element) => {
            if (element) {
              tabRefs.current[contentType] = element;
            } else {
              delete tabRefs.current[contentType];
            }
          }}
          role="tab"
          id={`search-tab-${contentType}`}
          aria-selected={contentType === state.contentType}
          aria-controls="search-results"
          onClick={onSelectTab.bind(null, contentType)}
          className={clsx(
            "cursor-pointer px-3 py-4 border-b-2 border-transparent whitespace-nowrap",
            contentType === state.contentType
              ? clsx("text-gray-1000", !indicator && "border-primary")
              : "text-gray-600 hover:text-gray-1000",
          )}
        >
          <Type style="bodyLarge">{searchTabs[contentType].label}</Type>
        </button>
      ))}
      {indicator && (
        <div
          aria-hidden
          className={clsx(
            "absolute bottom-0 left-0 h-0.5 bg-primary",
            animateIndicator &&
              "transition-[translate,width] duration-300 ease-out motion-reduce:transition-none",
          )}
          style={{
            width: indicator.width,
            translate: `${indicator.left}px 0`,
          }}
        />
      )}
    </div>
  );
}
