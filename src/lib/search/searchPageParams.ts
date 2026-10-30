import { z } from "zod/v4";
import range from "lodash/range";
import type { SearchQuery } from "./searchClient";
import { subtractTime, type TimeInterval } from "../timeUtils";

export const searchHighlightPreTag = "";
export const searchHighlightPostTag = "";

export const searchPageInitialLoadSize = 15;
export const searchPageLoadMoreSize = 10;

const searchSortings = [
  "relevance",
  "karma",
  "newest_first",
  "oldest_first",
] as const;

export type SearchSorting = (typeof searchSortings)[number];

export const searchSortingLabels: Record<SearchSorting, string> = {
  relevance: "Relevance",
  karma: "Karma",
  newest_first: "Newest first",
  oldest_first: "Oldest first",
};

const searchDateRanges = ["all", "day", "week", "month", "year"] as const;

export type SearchDateRange = (typeof searchDateRanges)[number];

export const searchDateRangeLabels: Record<SearchDateRange, string> = {
  all: "All",
  day: "Past 24 hours",
  week: "Past week",
  month: "Past month",
  year: "Past year",
};

const searchDateRangeIntervals: Record<
  Exclude<SearchDateRange, "all">,
  TimeInterval
> = {
  day: "days",
  week: "weeks",
  month: "months",
  year: "years",
};

export type SearchToggle = "curated" | "excludeEvents" | "core";

export const searchToggleLabels: Record<SearchToggle, string> = {
  curated: "Curated",
  excludeEvents: "Exclude events",
  core: "Core topic",
};

const searchToggleFacets: Record<SearchToggle, string> = {
  curated: "curated:true",
  excludeEvents: "isEvent:false",
  core: "core:true",
};

const allSortings: SearchSorting[] = [...searchSortings];

export const searchTabs = {
  Posts: {
    label: "Posts",
    indexName: "posts",
    dateLabel: "Filter by posted date",
    topicsField: "tags._id",
    sortings: allSortings,
    toggles: ["curated", "excludeEvents"],
  },
  Comments: {
    label: "Comments",
    indexName: "comments",
    dateLabel: "Filter by posted date",
    topicsField: "tags",
    sortings: allSortings,
    toggles: [],
  },
  Tags: {
    label: "Topics",
    indexName: "tags",
    dateLabel: null,
    topicsField: null,
    sortings: [],
    toggles: ["core"],
  },
  Sequences: {
    label: "Sequences",
    indexName: "sequences",
    dateLabel: "Filter by posted date",
    topicsField: null,
    sortings: allSortings.filter((sorting) => sorting !== "karma"),
    toggles: [],
  },
  Users: {
    label: "Users",
    indexName: "users",
    dateLabel: "Filter by joined date",
    topicsField: "tags._id",
    sortings: allSortings,
    toggles: [],
  },
} as const satisfies Record<
  string,
  {
    label: string;
    indexName: string;
    dateLabel: string | null;
    topicsField: string | null;
    sortings: SearchSorting[];
    toggles: SearchToggle[];
  }
>;

export type SearchContentType = keyof typeof searchTabs;

export type SearchTabConfig = (typeof searchTabs)[SearchContentType];

export const searchContentTypes = Object.keys(searchTabs) as SearchContentType[];

export type SearchPageState = {
  query: string;
  contentType: SearchContentType;
  sort: SearchSorting;
  date: SearchDateRange;
  tags: string[];
  curated: boolean;
  excludeEvents: boolean;
  core: boolean;
};

export const defaultSearchPageFilters = {
  sort: "relevance",
  date: "all",
  tags: [],
  curated: false,
  excludeEvents: true,
  core: false,
} as const satisfies Partial<SearchPageState>;

const contentTypeSchema = z.enum(searchContentTypes).catch("Posts");
const sortingSchema = z.enum(searchSortings).catch("relevance");
const dateRangeSchema = z.enum(searchDateRanges).catch("all");

export const isSortingAllowed = (
  contentType: SearchContentType,
  sort: SearchSorting,
): boolean => (searchTabs[contentType].sortings as SearchSorting[]).includes(sort);

export const parseSearchPageParams = (params: URLSearchParams): SearchPageState => {
  const contentType = contentTypeSchema.parse(
    params.get("contentType") ?? undefined,
  );
  const sort = sortingSchema.parse(params.get("sort") ?? undefined);
  return {
    query: params.get("query") ?? "",
    contentType,
    sort: isSortingAllowed(contentType, sort) ? sort : "relevance",
    date: dateRangeSchema.parse(params.get("date") ?? undefined),
    tags: params.getAll("tags").filter(Boolean),
    curated: params.get("curated") === "true",
    excludeEvents: params.get("includeEvents") !== "true",
    core: params.get("core") === "true",
  };
};

export const serializeSearchPageParams = (
  state: SearchPageState,
): URLSearchParams => {
  const params = new URLSearchParams();
  if (state.query) {
    params.set("query", state.query);
  }
  if (state.contentType !== "Posts") {
    params.set("contentType", state.contentType);
  }
  if (state.sort !== "relevance") {
    params.set("sort", state.sort);
  }
  if (state.date !== "all") {
    params.set("date", state.date);
  }
  for (const tag of state.tags) {
    params.append("tags", tag);
  }
  if (state.curated) {
    params.set("curated", "true");
  }
  if (!state.excludeEvents) {
    params.set("includeEvents", "true");
  }
  if (state.core) {
    params.set("core", "true");
  }
  return params;
};

export const hasActiveSearchFilters = (state: SearchPageState): boolean => {
  const tab: SearchTabConfig = searchTabs[state.contentType];
  return (
    (tab.sortings.length > 0 && state.sort !== defaultSearchPageFilters.sort) ||
    (!!tab.dateLabel && state.date !== defaultSearchPageFilters.date) ||
    (!!tab.topicsField && state.tags.length > 0) ||
    tab.toggles.some((toggle) => state[toggle] !== defaultSearchPageFilters[toggle])
  );
};

const buildSearchPageQuery = (
  state: SearchPageState,
  page: number,
  hitsPerPage: number,
  now: Date,
): SearchQuery => {
  const tab: SearchTabConfig = searchTabs[state.contentType];
  const sort = isSortingAllowed(state.contentType, state.sort)
    ? state.sort
    : "relevance";
  const facetFilters: string[][] = [];
  if (tab.topicsField && state.tags.length) {
    facetFilters.push(state.tags.map((tagId) => `${tab.topicsField}:${tagId}`));
  }
  for (const toggle of tab.toggles) {
    if (state[toggle]) {
      facetFilters.push([searchToggleFacets[toggle]]);
    }
  }
  const numericFilters: string[] = [];
  if (tab.dateLabel && state.date !== "all") {
    const start = subtractTime(now, 1, searchDateRangeIntervals[state.date]);
    numericFilters.push(`publicDateMs>=${start.getTime()}`);
  }
  return {
    indexName: sort === "relevance" ? tab.indexName : `${tab.indexName}_${sort}`,
    query: state.query,
    params: {
      query: state.query,
      page,
      hitsPerPage,
      highlightPreTag: searchHighlightPreTag,
      highlightPostTag: searchHighlightPostTag,
      facetFilters,
      numericFilters,
    },
  };
};

const greatestCommonDivisor = (a: number, b: number): number =>
  b === 0 ? a : greatestCommonDivisor(b, a % b);

export const getSearchPageLoadOffset = (loadIndex: number) =>
  loadIndex === 0
    ? 0
    : searchPageInitialLoadSize + (loadIndex - 1) * searchPageLoadMoreSize;

export const buildSearchPageQueries = (
  state: SearchPageState,
  loadIndex: number,
  now: Date,
): SearchQuery[] => {
  const offset = getSearchPageLoadOffset(loadIndex);
  const limit = loadIndex === 0 ? searchPageInitialLoadSize : searchPageLoadMoreSize;
  // The backend only accepts offsets that are a multiple of the page size, so
  // loads that don't align are split into smaller pages
  const hitsPerPage = greatestCommonDivisor(limit, offset);
  const firstPage = offset / hitsPerPage;
  return range(limit / hitsPerPage).map((i) =>
    buildSearchPageQuery(state, firstPage + i, hitsPerPage, now),
  );
};
