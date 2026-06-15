import stringify from "json-stringify-deterministic";
import { LRUCache } from "lru-cache";
import { z } from "zod/v4";
import type { SearchBase } from "./searchDocuments";
import { rpc } from "../rpc";
import { SearchResult } from "./SearchResult";

const searchQuerySchema = z.object({
  indexName: z.string(),
  query: z.optional(z.string()),
  params: z.object({
    query: z.optional(z.string()),
    highlightPreTag: z.optional(z.string()),
    highlightPostTag: z.optional(z.string()),
    hitsPerPage: z.optional(z.number().int().nonnegative()),
    page: z.optional(z.number().int().nonnegative()),
    facetFilters: z.optional(z.array(z.array(z.string()))),
    numericFilters: z.optional(z.array(z.string())),
    existsFilters: z.optional(z.array(z.string())),
    aroundLatLng: z.optional(z.string()),
  }),
});

const searchOptionsSchema = z.object({
  emptyStringSearchResults: z.union([z.literal("default"), z.literal("empty")]),
});

export type SearchOptions = z.infer<typeof searchOptionsSchema>;

export const defaultSearchOptions: SearchOptions = {
  emptyStringSearchResults: "default",
};

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const queryRequestSchema = z.object({
  options: z.optional(searchOptionsSchema),
  queries: z.array(searchQuerySchema),
});

export const getSearchIndexPrefix = () =>
  process.env.NEXT_PUBLIC_SEARCH_INDEX_PREFIX ?? "";

export class SearchClient {
  private cache = new LRUCache<string, Promise<SearchResult<SearchBase>[]>>({
    max: 200,
  });

  constructor(private options: SearchOptions) {}

  search<T extends SearchBase>(queries: SearchQuery[]): Promise<SearchResult<T>[]> {
    const indexPrefix = getSearchIndexPrefix();
    if (indexPrefix) {
      for (const query of queries) {
        query.indexName = indexPrefix + query.indexName;
      }
    }
    const body = {
      options: this.options,
      queries,
    };
    const cacheKey = stringify(body);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return Promise.resolve(cached) as Promise<SearchResult<T>[]>;
    }
    const promise = rpc.search.search(body) as unknown as Promise<SearchResult<T>[]>;
    this.cache.set(cacheKey, promise);
    return promise;
  }
}

const searchClientsByOptions: Record<string, SearchClient> = {};

export const getSearchClient = (
  options: SearchOptions = { emptyStringSearchResults: "default" },
): SearchClient => {
  const optionsStr = stringify(options);
  if (!searchClientsByOptions[optionsStr]) {
    searchClientsByOptions[optionsStr] = new SearchClient(options);
  }
  return searchClientsByOptions[optionsStr];
};
