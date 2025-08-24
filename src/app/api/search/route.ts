import uniq from "lodash/uniq";
import ElasticService from "@/lib/search/elastic/ElasticService";
import { defaultSearchOptions, queryRequestSchema } from "@/lib/search/searchClient";

export const POST = async (req: Request) => {
  const body = await req.json();
  const parsedBody = queryRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json(
      {
        error: "Expected an array of queries or an object with options",
      },
      { status: 400 },
    );
  }

  const searchOptions = parsedBody.data.options ?? defaultSearchOptions;
  const queries = parsedBody.data.queries;

  if (!queries.length) {
    return Response.json(
      {
        error: "No queries found",
      },
      { status: 400 },
    );
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
    return Response.json(results, { status: 200 });
  } catch (error) {
    console.error("Search error:", error, JSON.stringify(error, null, 2));
    return Response.json(
      {
        error: error instanceof Error ? error.message : "An error occurred",
      },
      { status: 400 },
    );
  }
};
