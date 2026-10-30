"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import type { SearchDocument } from "@/lib/search/searchDocuments";
import { getSearchClient } from "@/lib/search/searchClient";
import { useSearchAnalytics } from "@/lib/search/useSearchAnalytics";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import {
  SearchContentType,
  SearchPageState,
  SearchTabConfig,
  buildSearchPageQueries,
  defaultSearchPageFilters,
  getSearchPageLoadOffset,
  hasActiveSearchFilters,
  parseSearchPageParams,
  searchTabs,
  serializeSearchPageParams,
} from "@/lib/search/searchPageParams";

type SearchPageFilterUpdate = Partial<
  Omit<SearchPageState, "query" | "contentType">
>;

type SearchPageContext = {
  state: SearchPageState;
  tab: SearchTabConfig;
  inputQuery: string;
  setInputQuery: (query: string) => void;
  setContentType: (contentType: SearchContentType) => void;
  updateFilters: (update: SearchPageFilterUpdate) => void;
  clearFilters: () => void;
  hasFilters: boolean;
  hits: SearchDocument[];
  totalHits: number;
  loading: boolean;
  error: boolean;
  canLoadMore: boolean;
  loadMore: () => void;
};

const searchPageContext = createContext<SearchPageContext | null>(null);

export const SearchPageProvider = ({ children }: { children: ReactNode }) => {
  const captureSearch = useSearchAnalytics();
  const searchParams = useSearchParams();
  const [state, setState] = useState(() => parseSearchPageParams(searchParams));
  const [inputQuery, setInputQuery_] = useState(state.query);
  const [now, setNow] = useState(() => new Date());
  // Results are stored per load so that out-of-order responses can't
  // duplicate or reorder hits
  const [results, setResults] = useState<SearchDocument[][]>([]);
  const [loadIndex, setLoadIndex] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestIdRef = useRef(0);

  const updateState = useCallback((update: Partial<SearchPageState>) => {
    setState((state) => ({ ...state, ...update }));
    setNow(new Date());
    setLoadIndex(0);
    setResults([]);
    setTotalHits(0);
    setLoading(true);
  }, []);

  const commitQuery = useDebouncedCallback(
    (query: string) => updateState({ query }),
    {
      rateLimitMs: 300,
      callOnLeadingEdge: false,
      onUnmount: "cancelPending",
      allowExplicitCallAfterUnmount: false,
    },
  );

  const setInputQuery = useCallback(
    (query: string) => {
      setInputQuery_(query);
      commitQuery(query);
    },
    [commitQuery],
  );

  const urlQuery = searchParams.get("query") ?? "";
  const lastUrlQueryRef = useRef(urlQuery);
  useEffect(() => {
    // Handle navigations from outside the page, such as the header search
    if (urlQuery !== lastUrlQueryRef.current) {
      lastUrlQueryRef.current = urlQuery;
      if (urlQuery !== state.query) {
        setInputQuery_(urlQuery);
        updateState({ query: urlQuery });
      }
    }
  }, [urlQuery, state.query, updateState]);

  useEffect(() => {
    lastUrlQueryRef.current = state.query;
    const query = serializeSearchPageParams(state).toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", url);
    }
  }, [state]);

  const setContentType = useCallback(
    (contentType: SearchContentType) => {
      updateState({ contentType, sort: defaultSearchPageFilters.sort });
    },
    [updateState],
  );

  const updateFilters = useCallback(
    (update: SearchPageFilterUpdate) => updateState(update),
    [updateState],
  );

  const clearFilters = useCallback(() => {
    updateState({ ...defaultSearchPageFilters });
  }, [updateState]);

  const canLoadMore = getSearchPageLoadOffset(loadIndex + 1) < totalHits;

  const loadMore = useCallback(() => {
    if (!loading && canLoadMore) {
      setLoadIndex(loadIndex + 1);
    }
  }, [loading, canLoadMore, loadIndex]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const pages = await getSearchClient().search<SearchDocument>(
          buildSearchPageQueries(state, loadIndex, now),
        );
        if (requestIdRef.current !== requestId) {
          return;
        }
        setResults((previousResults) => {
          const newResults = [...previousResults];
          newResults[loadIndex] = pages.flatMap(({ hits }) => hits);
          return newResults;
        });
        setTotalHits(pages[0].nbHits);
        if (state.query) {
          captureSearch("searchPageTabbed", { ...state, loadIndex });
        }
      } catch (e) {
        if (requestIdRef.current !== requestId) {
          return;
        }
        console.error("Search page error:", e);
        captureException(e);
        setError(true);
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    })();
  }, [captureSearch, state, loadIndex, now]);

  const hits = useMemo(() => results.flat().filter(Boolean), [results]);

  return (
    <searchPageContext.Provider
      value={{
        state,
        tab: searchTabs[state.contentType],
        inputQuery,
        setInputQuery,
        setContentType,
        updateFilters,
        clearFilters,
        hasFilters: hasActiveSearchFilters(state),
        hits,
        totalHits,
        loading,
        error,
        canLoadMore,
        loadMore,
      }}
    >
      {children}
    </searchPageContext.Provider>
  );
};

export const useSearchPage = (): SearchPageContext => {
  const context = useContext(searchPageContext);
  if (!context) {
    throw new Error("Using search page context outside of a provider");
  }
  return context;
};
