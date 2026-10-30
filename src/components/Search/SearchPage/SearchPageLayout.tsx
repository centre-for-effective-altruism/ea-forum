"use client";

import SearchPageColumns from "./SearchPageColumns";
import SearchPageFilters from "./SearchPageFilters";
import SearchPageMobileFilters from "./SearchPageMobileFilters";
import SearchPageInput from "./SearchPageInput";
import SearchPageTabs from "./SearchPageTabs";
import SearchPageResults from "./SearchPageResults";

export default function SearchPageLayout() {
  return (
    <SearchPageColumns filters={<SearchPageFilters />}>
      <div className="flex items-center gap-2 max-w-[720px]">
        <SearchPageInput />
        <SearchPageMobileFilters />
      </div>
      <SearchPageTabs />
      <SearchPageResults />
    </SearchPageColumns>
  );
}
