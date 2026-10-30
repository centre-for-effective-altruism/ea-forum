import { captureException } from "@sentry/nextjs";
import { defaultSearchOptions, queryRequestSchema } from "./searchClient";
import type { SearchResult } from "./SearchResult";
import { os } from "@orpc/server";
import ElasticService from "./elastic/ElasticService";
import ElasticExporter from "./elastic/ElasticExporter";
import { getCurrentUser } from "@/lib/users/currentUser";
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
  rebuildIndexes: os.handler(async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      throw new Error("Permission denied");
    }
    await new ElasticExporter().configureIndexes();
  }),
  deleteOrphanedIndexes: os.handler(async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      throw new Error("Permission denied");
    }
    return new ElasticExporter().deleteOrphanedIndexes();
  }),
  indexStatuses: os.handler(async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      throw new Error("Permission denied");
    }
    return new ElasticExporter().getIndexStatuses();
  }),
};
