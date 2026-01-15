import stringify from "json-stringify-deterministic";
import { LRUCache } from "lru-cache";
import { z } from "zod";
import type { SearchBase } from "./searchDocuments";

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

interface Response<T extends SearchBase> {
  hits: T[];
  page: number;
  nbHits: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
  params: string;
  /**
   * A mapping of each facet name to the corresponding facet counts.
   */
  facets?: {
    [facetName: string]: { [facetValue: string]: number };
  };
}

interface MultiResponse<T extends SearchBase> {
  results: Response<T>[];
}

export const getSearchIndexPrefix = () =>
  process.env.NEXT_PUBLIC_SEARCH_INDEX_PREFIX ?? "";

export class SearchClient {
  private cache = new LRUCache<string, Promise<MultiResponse<SearchBase>>>({
    max: 200,
  });

  constructor(private options: SearchOptions) {}

  search<T extends SearchBase>(queries: SearchQuery[]): Promise<MultiResponse<T>> {
    const indexPrefix = getSearchIndexPrefix();
    if (indexPrefix) {
      for (const query of queries) {
        query.indexName = indexPrefix + query.indexName;
      }
    }
    const body = stringify({
      options: this.options,
      queries,
    });
    const cached = this.cache.get(body);
    if (cached) {
      return Promise.resolve(cached) as Promise<MultiResponse<T>>;
    }
    const promise = new Promise<MultiResponse<T>>((resolve, reject) => {
      fetch("/api/search-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      })
        .then((response) => {
          response
            .json()
            .then((results) => {
              resolve({ results });
            })
            .catch(reject);
        })
        .catch(reject);
    });
    this.cache.set(body, promise);
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
