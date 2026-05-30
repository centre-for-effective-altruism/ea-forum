import { captureException } from "@sentry/nextjs";
import { defaultSearchOptions, queryRequestSchema } from "./searchClient";
import type { SearchResult } from "./SearchResult";
import { os } from "@orpc/server";
import ElasticService from "./elastic/ElasticService";
import uniq from "lodash/uniq";

export const searchRouter = {
  search: os
    .input(queryRequestSchema)
    .handler(async ({ input: { options, queries } }): Promise<SearchResult[]> => {
      const searchOptions = options ?? defaultSearchOptions;
      if (!queries.length) {
        throw new Error("No queries found");
      }
      try {
        const service = new ElasticService();
        const results = await Promise.all(
          queries.map((q) => service.runQuery(q, searchOptions)),
        );
        for (const result of results) {
          const resultIds = result.hits.map((r) => r._id);
          if (uniq(resultIds).length !== resultIds.length) {
            console.error("Search result set contained duplicate entries");
          }
        }
        return results;
      } catch (error) {
        console.error("Search error:", error, JSON.stringify(error, null, 2));
        captureException(error);
        throw new Error(
          error instanceof Error ? error.message : "An error occurred",
          { cause: error },
        );
      }
    }),
};
