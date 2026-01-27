"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import type { SearchUser } from "@/lib/search/searchDocuments";
import { getSearchClient } from "@/lib/search/searchClient";
import { useSearchAnalytics } from "@/lib/search/useSearchAnalytics";
import { userCareerStages } from "@/lib/users/userHelpers";
import { filterNonNull } from "@/lib/typeHelpers";
import {
  PeopleDirectoryColumn,
  peopleDirectoryColumns,
} from "./peopleDirectoryColumns";
import {
  MultiSelectResult,
  MultiSelectState,
  useMultiSelect,
} from "@/lib/hooks/useMultiSelect";
import {
  SearchableMultiSelectResult,
  useSearchableMultiSelect,
} from "@/lib/hooks/useSearchableMultiSelect";

type PeopleDirectoryView = "list" | "map";

type PeopleDirectorySorting = {
  field: string;
  direction: "asc" | "desc";
};

const defaultSorting: PeopleDirectorySorting = {
  field: "profileCompletion",
  direction: "desc",
};

type PeopleDirectoryStaticFilterConfig = {
  type: "static";
  filter: MultiSelectResult;
};

type PeopleDirectorySearchableFilterConfig = {
  type: "searchable";
  filter: SearchableMultiSelectResult;
};

type PeopleDirectoryFilterConfig =
  | PeopleDirectoryStaticFilterConfig
  | PeopleDirectorySearchableFilterConfig;

type PeopleDirectoryContext = {
  view: PeopleDirectoryView;
  setView: (view: PeopleDirectoryView) => void;
  query: string;
  setQuery: (query: string) => void;
  clearSearch: () => void;
  isEmptySearch: boolean;
  sorting: PeopleDirectorySorting;
  setSorting: (sorting: PeopleDirectorySorting | null) => void;
  isDefaultSorting: boolean;
  results: SearchUser[];
  resultsLoading: boolean;
  totalResults: number;
  loadMore: () => void;
  filters: PeopleDirectoryFilterConfig[];
  columns: (PeopleDirectoryColumn & MultiSelectState)[];
  columnsEdited: boolean;
  resetColumns: () => void;
};

const peopleDirectoryContext = createContext<PeopleDirectoryContext | null>(null);

export const PeopleDirectoryProvider = ({ children }: { children: ReactNode }) => {
  const captureSearch = useSearchAnalytics();
  const searchParams = useSearchParams();
  const [view, setView] = useState<PeopleDirectoryView>("list");
  const [query, setQuery_] = useState(() => searchParams.get("query") ?? "");
  const [sorting, setSorting_] = useState<PeopleDirectorySorting>(defaultSorting);
  // We store the results in an 2D-array, where the index in the first array
  // corresponds to the "page" of the contained results. This prevents a class
  // of bugs where updates cause results to be out-of-order or duplicated.
  const [results, setResults] = useState<SearchUser[][]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(0);
  const [numPages, setNumPages] = useState(0);

  // TODO Select core tags with limit MULTISELECT_SUGGESTION_LIMIT
  const coreTags: { name: string }[] = [];
  const tagCount = 0; // TODO: Fetch total tag count

  const roles = useSearchableMultiSelect({
    title: "Role",
    facetField: "jobTitle",
  });
  const organizations = useSearchableMultiSelect({
    title: "Organization",
    facetField: "organization",
  });
  const locations = useSearchableMultiSelect({
    title: "Location",
    facetField: "mapLocationAddress",
  });
  const careerStages = useMultiSelect({
    title: "Career stage",
    options: userCareerStages,
  });
  const tags = useSearchableMultiSelect({
    title: "Topic interests",
    placeholder: `Search ${tagCount ? tagCount + " " : ""}topics...`,
    elasticField: { index: "tags", fieldName: "name" },
    defaultSuggestions: coreTags?.map(({ name }) => name),
  });

  const filters: PeopleDirectoryFilterConfig[] = [
    {
      type: "searchable",
      filter: roles,
    },
    {
      type: "searchable",
      filter: organizations,
    },
    {
      type: "static",
      filter: careerStages,
    },
    {
      type: "searchable",
      filter: locations,
    },
    {
      type: "searchable",
      filter: tags,
    },
  ];

  const flattenedResults = useMemo(() => {
    const flattenedResults = results.flatMap((resultsPage) => resultsPage);
    // HACK: We mostly can't repro the situation that causes undefined values in
    // the results, so instead of finding the root cause we'll just filter them
    // out.
    const hackyNullRemoval = filterNonNull(flattenedResults);
    if (flattenedResults.length !== hackyNullRemoval.length) {
      console.warn(
        "People directory results contained undefined values",
        flattenedResults,
      );
    }
    return hackyNullRemoval;
  }, [results]);

  const updateUrlQuery = useCallback(
    (update: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const param in update) {
        newParams.set(param, update[param]);
      }
      window.history.pushState(null, "", `?${newParams.toString()}`);
    },
    [searchParams],
  );

  const setQuery = useCallback(
    (query: string) => {
      setQuery_(query);
      updateUrlQuery({ query });
    },
    [updateUrlQuery],
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    roles.clear();
    organizations.clear();
    locations.clear();
    careerStages.clear();
    tags.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    roles.clear,
    organizations.clear,
    locations.clear,
    careerStages.clear,
    tags.clear,
  ]);

  const isEmptySearch =
    query === "" &&
    roles.selectedValues.length === 0 &&
    organizations.selectedValues.length === 0 &&
    locations.selectedValues.length === 0 &&
    careerStages.selectedValues.length === 0 &&
    tags.selectedValues.length === 0;

  const [columns, setColumns] = useState(peopleDirectoryColumns);
  const [columnsEdited, setColumnsEdited] = useState(false);
  const toggleColumn = useCallback((columnLabel: string) => {
    setColumns((columns) =>
      columns.map((column) => {
        return column.label === columnLabel && column.hideable
          ? {
              ...column,
              hidden: !column.hidden,
            }
          : column;
      }),
    );
    setColumnsEdited(true);
  }, []);
  const resetColumns = useCallback(() => {
    setColumns(peopleDirectoryColumns);
    setColumnsEdited(false);
  }, []);
  const columnSelectState = useMemo(() => {
    return columns.map((column) => ({
      ...column,
      value: column.label,
      label: column.label,
      selected: column.hideable && !column.hidden,
      onToggle: () => toggleColumn(column.label),
    }));
  }, [columns, toggleColumn]);

  const setSorting = useCallback(
    (sorting: PeopleDirectorySorting | null) => {
      setSorting_((oldSorting) => {
        if (
          sorting &&
          sorting.field === oldSorting.field &&
          sorting.direction === oldSorting.direction
        ) {
          return defaultSorting;
        }
        if (sorting) {
          const column = columns.find(
            ({ sortField }) => sortField === sorting.field,
          );
          if (column?.hideable && column.hidden) {
            toggleColumn(column.label);
            setColumnsEdited(true);
          }
        }
        return sorting ?? defaultSorting;
      });
    },
    [columns, toggleColumn],
  );

  const isDefaultSorting = sorting === defaultSorting;

  const loadMore = useCallback(() => {
    const newPage = page + 1;
    if (!resultsLoading && newPage < numPages) {
      setPage(newPage);
    }
  }, [resultsLoading, page, numPages]);

  useEffect(() => {
    setResults([]);
    setTotalResults(0);
    setPage(0);
    setNumPages(0);
  }, [
    view,
    query,
    sorting,
    roles.selectedValues,
    organizations.selectedValues,
    locations.selectedValues,
    careerStages.selectedValues,
    tags.selectedValues,
  ]);

  useEffect(() => {
    setResultsLoading(true);
    void (async () => {
      try {
        const isMap = view === "map";
        const sortString =
          query && isDefaultSorting ? "" : `_${sorting.field}:${sorting.direction}`;
        const facetFilters = [
          roles.selectedValues.map((role) => `jobTitle:${role}`),
          organizations.selectedValues.map((org) => `organization:${org}`),
          locations.selectedValues.map(
            (location) => `mapLocationAddress:${location}`,
          ),
          careerStages.selectedValues.map((stage) => `careerStage:${stage}`),
          tags.selectedValues.map((tag) => `tags.name:${tag}`),
          ["hideFromPeopleDirectory:false"],
          isMap ? ["_geoloc:-null"] : [],
        ];
        const response = await getSearchClient().search<SearchUser>([
          {
            indexName: "users" + sortString,
            query,
            params: {
              query,
              facetFilters,
              page,
              hitsPerPage: isMap ? 250 : undefined,
            },
          },
        ]);
        const results = response?.results?.[0];
        const hits = results?.hits ?? [];
        setResults((previousResults) => {
          const newResults = [...previousResults];
          newResults[results?.page ?? 0] = hits;
          return newResults;
        });
        setTotalResults(results?.nbHits ?? 0);
        setNumPages(results?.nbPages ?? 0);
        captureSearch("peopleDirectorySearch", {
          query,
          sorting,
          roles: roles.selectedValues,
          organizations: organizations.selectedValues,
          locations: locations.selectedValues,
          careerStages: careerStages.selectedValues,
          tags: tags.selectedValues,
          hitCount: hits.length,
        });
      } catch (e) {
        console.error("People directory search error:", e);
        captureException(e);
      } finally {
        setResultsLoading(false);
      }
    })();
  }, [
    captureSearch,
    page,
    view,
    query,
    sorting,
    isDefaultSorting,
    roles.selectedValues,
    organizations.selectedValues,
    locations.selectedValues,
    careerStages.selectedValues,
    tags.selectedValues,
  ]);

  return (
    <peopleDirectoryContext.Provider
      value={{
        view,
        setView,
        query,
        setQuery,
        clearSearch,
        isEmptySearch,
        sorting,
        setSorting,
        isDefaultSorting,
        results: flattenedResults,
        resultsLoading,
        totalResults,
        loadMore,
        filters,
        columns: columnSelectState,
        columnsEdited,
        resetColumns,
      }}
    >
      {children}
    </peopleDirectoryContext.Provider>
  );
};

export const usePeopleDirectory = (): PeopleDirectoryContext => {
  const context = useContext(peopleDirectoryContext);
  if (!context) {
    throw new Error("Using people directory context outside of a provider");
  }
  return context;
};
