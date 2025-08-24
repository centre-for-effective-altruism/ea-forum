import {
  Client,
  SniffingTransport,
  TransportOptions,
  type estypes,
} from "@elastic/elasticsearch";
import type { SearchDocument } from "../searchDocuments";
import ElasticQuery, { QueryData } from "./ElasticQuery";
import { MultiQueryData } from "./ElasticMultiQuery";
import {
  getElasticCloudId,
  getElasticPassword,
  getElasticUsername,
} from "./elasticSettings";
import take from "lodash/take";
import sortBy from "lodash/sortBy";

type SearchHit<T> = estypes.SearchHit<T>;
type SearchResponse<T> = estypes.SearchResponse<T>;
type SearchTotalHits = estypes.SearchTotalHits;

export type ElasticSearchHit = SearchHit<SearchDocument>;
export type ElasticSearchResponse = SearchResponse<SearchDocument>;

export type HitsOnlySearchResponse = {
  hits: {
    total?: number | SearchTotalHits;
    hits: ElasticSearchHit[];
  };
};

const DEBUG_LOG_ELASTIC_QUERIES = false;

let globalClient: Client | null = null;

/**
 * We're using v9 of the Node library, but the server is still on v8. We
 * override some headers to make this compatible using this custom transport.
 * Once we upgrade the elastic server to v9 this class can be removed.
 */
class CustomTransport extends SniffingTransport {
  constructor(options: TransportOptions) {
    const vendoredHeaders = {
      ...options.vendoredHeaders,
      jsonContentType: "application/vnd.elasticsearch+json; compatible-with=8",
      ndjsonContentType: "application/vnd.elasticsearch+x-ndjson; compatible-with=8",
      accept: "application/vnd.elasticsearch+json; compatible-with=8,text/plain",
    };
    super({
      ...options,
      vendoredHeaders,
    });
  }
}

class ElasticClient {
  private client: Client;

  constructor() {
    const cloudId = getElasticCloudId();
    const username = getElasticUsername();
    const password = getElasticPassword();

    if (!globalClient) {
      globalClient = new Client({
        requestTimeout: 600000,
        cloud: { id: cloudId },
        auth: {
          username,
          password,
        },
        Transport: CustomTransport,
      });
      if (!globalClient) {
        throw new Error("Failed to connect to Elasticsearch");
      }
    }

    this.client = globalClient;
  }

  getClient() {
    return this.client;
  }

  search(queryData: QueryData): Promise<HitsOnlySearchResponse> {
    const query = new ElasticQuery(queryData);
    const request = query.compile();
    if (DEBUG_LOG_ELASTIC_QUERIES) {
      // eslint-disable-next-line no-console
      console.log("Elastic query:", JSON.stringify(request, null, 2));
    }
    return this.client.search(request);
  }

  async multiSearch(queryData: MultiQueryData): Promise<HitsOnlySearchResponse> {
    // Perform the same search against each index
    const resultsBySearchIndex = await Promise.all(
      queryData.indexes.map((searchIndex) =>
        this.client.search(
          new ElasticQuery({
            index: searchIndex,
            filters: [],
            limit: queryData.limit,
            search: queryData.search,
          }).compile(),
        ),
      ),
    );

    // Merge the result set, sorting the merged list by similarity score (even
    // though similarity score calculation methods may differ between indexes)
    // and applying the limit.
    const mergedResultsList = resultsBySearchIndex.flatMap((r) => r.hits.hits);
    const sortedResults = take(
      sortBy(mergedResultsList, (h) => -(h._score ?? 0)),
      queryData.limit,
    );

    return {
      hits: {
        total: mergedResultsList.length,
        hits: sortedResults as ElasticSearchHit[],
      },
    };
  }
}

export default ElasticClient;
