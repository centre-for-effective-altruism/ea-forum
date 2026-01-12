import { isAnyTest } from "@/lib/environment";
import type { SearchIndexCollectionName } from "./elasticIndexes";
import ElasticClient from "./ElasticClient";
import ElasticExporter from "./ElasticExporter";

export const elasticSyncDocument = async (
  collectionName: SearchIndexCollectionName,
  documentId: string,
) => {
  if (isAnyTest()) {
    return;
  }
  try {
    const client = new ElasticClient();
    const exporter = new ElasticExporter(client);
    await exporter.updateDocument(collectionName, documentId);
  } catch (e) {
    console.error(`[${collectionName}] Failed to index Elasticsearch document:`, e);
  }
};
