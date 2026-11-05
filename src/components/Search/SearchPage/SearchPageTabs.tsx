"use client";

import { useCallback } from "react";
import {
  SearchContentType,
  searchContentTypes,
  searchTabs,
} from "@/lib/search/searchPageParams";
import { useTabIndicator } from "@/lib/hooks/useTabIndicator";
import { useSearchPage } from "./useSearchPage";
import clsx from "clsx";
import TabIndicator from "../../TabIndicator";
import Type from "../../Type";

export default function SearchPageTabs() {
  const { state, setContentType } = useSearchPage();
  const { tabListRef, setTabRef, indicator, animate, enableAnimation } =
    useTabIndicator(state.contentType);

  const onSelectTab = useCallback(
    (contentType: SearchContentType) => {
      if (contentType !== state.contentType) {
        enableAnimation();
        setContentType(contentType);
      }
    },
    [state.contentType, setContentType, enableAnimation],
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
          ref={setTabRef(contentType)}
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
      <TabIndicator indicator={indicator} animate={animate} />
    </div>
  );
}
