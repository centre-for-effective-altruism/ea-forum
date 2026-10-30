"use client";

import { useId } from "react";
import {
  SearchDateRange,
  SearchSorting,
  SearchToggle,
  searchDateRangeLabels,
  searchSortingLabels,
  searchToggleLabels,
} from "@/lib/search/searchPageParams";
import { useSearchPage } from "./useSearchPage";
import SearchPageTopicFilter from "./SearchPageTopicFilter";
import Checkbox from "../../Forms/Checkbox";
import TextLinkButton from "../../TextLinkButton";
import Type from "../../Type";
import clsx from "clsx";

const searchDateRanges = Object.keys(searchDateRangeLabels) as SearchDateRange[];

const FilterOption = ({
  label,
  active,
  onClick,
}: Readonly<{
  label: string;
  active: boolean;
  onClick: () => void;
}>) => (
  <Type
    style="bodySmall"
    As="button"
    aria-pressed={active}
    onClick={onClick}
    className={clsx(
      "cursor-pointer block text-left",
      active ? "text-gray-1000" : "text-gray-600 hover:text-gray-1000",
    )}
  >
    {label}
  </Type>
);

export default function SearchPageFilters() {
  const { state, tab, updateFilters, clearFilters, hasFilters } = useSearchPage();
  const checkboxIdPrefix = useId();
  const toggles: readonly SearchToggle[] = tab.toggles;
  const sortings: readonly SearchSorting[] = tab.sortings;

  return (
    <div data-component="SearchPageFilters" className="flex flex-col gap-6">
      <Type style="sectionTitleLarge">Filters</Type>
      {tab.dateLabel && (
        <section className="flex flex-col gap-1">
          <Type style="sectionTitleSmall" className="mb-1">
            {tab.dateLabel}
          </Type>
          {searchDateRanges.map((date) => (
            <FilterOption
              key={date}
              label={searchDateRangeLabels[date]}
              active={state.date === date}
              onClick={() => updateFilters({ date })}
            />
          ))}
        </section>
      )}
      {tab.topicsField && <SearchPageTopicFilter />}
      {toggles.length > 0 && (
        <section className="flex flex-col gap-2">
          {toggles.map((toggle) => (
            <Checkbox
              key={toggle}
              label={{
                id: `${checkboxIdPrefix}-${toggle}`,
                text: searchToggleLabels[toggle],
              }}
              checked={state[toggle]}
              onChange={(checked) => updateFilters({ [toggle]: checked })}
              className="text-gray-600"
            />
          ))}
        </section>
      )}
      {sortings.length > 0 && (
        <section className="flex flex-col gap-1">
          <Type style="sectionTitleSmall" className="mb-1">
            Sort by
          </Type>
          {sortings.map((sort) => (
            <FilterOption
              key={sort}
              label={searchSortingLabels[sort]}
              active={state.sort === sort}
              onClick={() => updateFilters({ sort })}
            />
          ))}
        </section>
      )}
      {(hasFilters || state.contentType === "Users") && (
        <div className="flex flex-col items-start gap-2">
          {hasFilters && (
            <TextLinkButton onClick={clearFilters}>Clear filters</TextLinkButton>
          )}
          {state.contentType === "Users" && (
            <TextLinkButton href="/groups#individuals">
              View community map
            </TextLinkButton>
          )}
        </div>
      )}
    </div>
  );
}
