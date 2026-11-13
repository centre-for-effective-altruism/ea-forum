import { isAnyTest } from "@/lib/environment";
import { mapInBatches } from "@/lib/utils/asyncUtils";
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

const elasticSyncBatchSize = 20;

export const elasticSyncDocuments = (
  documents: [SearchIndexCollectionName, string[]][],
) =>
  mapInBatches(
    documents.flatMap(([collectionName, ids]) =>
      ids.map((id) => [collectionName, id] as const),
    ),
    elasticSyncBatchSize,
    ([collectionName, id]) => elasticSyncDocument(collectionName, id),
  );
