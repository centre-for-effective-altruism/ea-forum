/* eslint-disable no-console */

import { helpers } from "@elastic/elasticsearch";
import { htmlToTextDefault } from "@/lib/utils/htmlToText";
import ElasticClient from "./ElasticClient";
import type { SearchDocument } from "../searchDocuments";
import { collectionNameToConfig, Mappings } from "./ElasticConfig";
import { getSearchRepoByCollectionName } from "./fetchSearchDocuments";
import {
  getElasticIndexName,
  SearchIndexCollectionName,
  searchIndexedCollectionNames,
} from "./elasticIndexes";

const HTML_FIELDS = [
  "body",
  "bio",
  "howOthersCanHelpMe",
  "howICanHelpOthers",
  "plaintextDescription",
  "description",
];

export type SearchBackingIndexStatus = {
  name: string;
  createdAt: number;
  docsCount: number;
  isLive: boolean;
  reindexProgress: { copied: number; total: number } | null;
};

export type SearchIndexStatus = {
  collectionName: SearchIndexCollectionName;
  aliasName: string;
  indexes: SearchBackingIndexStatus[];
};

export type DeleteOrphanedIndexesResult = {
  deleted: string[];
  skipped: { name: string; reason: string }[];
};

export class ElasticExporter {
  constructor(private client = new ElasticClient()) {}

  async printClientInfo() {
    const client = this.client.getClient();
    const info = await client.info();
    console.log("Elastic client info:", info);
  }

  async printInfo() {
    const client = this.client.getClient();
    const info = await client.info();
    console.log(info);

    const indexes = await client.indices.get({
      index: "*",
    });
    for (const [indexName, elasticIndex] of Object.entries(indexes)) {
      console.log(indexName);
      if (elasticIndex.aliases) {
        console.log(`    Aliases [${Object.keys(elasticIndex.aliases).join(", ")}]`);
      }
    }
  }

  async configureIndexes() {
    for (const collectionName of searchIndexedCollectionNames) {
      await this.configureIndex(collectionName);
    }
  }

  /**
   * Lists the backing indexes for each collection, newest first, along with
   * the progress of any reindexes that are still copying documents into them
   */
  async getIndexStatuses(): Promise<SearchIndexStatus[]> {
    const client = this.client.getClient();
    const aliasNames = searchIndexedCollectionNames.map(getElasticIndexName);
    const [indexes, aliases, reindexTasks] = await Promise.all([
      client.cat.indices({
        index: aliasNames.map((aliasName) => `${aliasName}_*`),
        h: ["index", "docs.count", "creation.date"],
        format: "json",
      }),
      client.cat.aliases({
        name: aliasNames,
        h: ["alias", "index"],
        format: "json",
      }),
      client.tasks.list({
        actions: "*reindex",
        detailed: true,
        group_by: "none",
      }),
    ]);

    const liveIndexNames = new Set(aliases.map(({ index }) => index));
    const reindexProgressByIndexName = new Map<
      string,
      SearchBackingIndexStatus["reindexProgress"]
    >();
    const tasks = Array.isArray(reindexTasks.tasks) ? reindexTasks.tasks : [];
    for (const { description, status } of tasks) {
      const destinationIndexName = /to \[([^\]]+)\]/.exec(description ?? "")?.[1];
      if (destinationIndexName) {
        reindexProgressByIndexName.set(destinationIndexName, {
          copied: (status?.created ?? 0) + (status?.updated ?? 0),
          total: status?.total ?? 0,
        });
      }
    }

    return searchIndexedCollectionNames.map((collectionName) => {
      const aliasName = getElasticIndexName(collectionName);
      const backingIndexPattern = new RegExp(`^${aliasName}_\\d+$`);
      return {
        collectionName,
        aliasName,
        indexes: indexes
          .filter(({ index }) => index && backingIndexPattern.test(index))
          .map(({ index, "docs.count": docsCount, "creation.date": createdAt }) => ({
            name: index!,
            createdAt: Number(createdAt),
            docsCount: Number(docsCount ?? 0),
            isLive: liveIndexNames.has(index),
            reindexProgress: reindexProgressByIndexName.get(index!) ?? null,
          }))
          .sort((a, b) => b.createdAt - a.createdAt),
      };
    });
  }

  async exportAll() {
    await Promise.all(
      searchIndexedCollectionNames.map((collectionName) =>
        this.exportCollection(collectionName),
      ),
    );
  }

  /**
   * Deletes the old backing indexes left behind by `configureIndex`. An old
   * index is only deleted once its collection has a live index which has
   * finished copying and has at least as many documents, as the old index is
   * otherwise needed to finish the copy or to roll back.
   */
  async deleteOrphanedIndexes(): Promise<DeleteOrphanedIndexesResult> {
    const client = this.client.getClient();
    const result: DeleteOrphanedIndexesResult = { deleted: [], skipped: [] };
    for (const { indexes } of await this.getIndexStatuses()) {
      const liveIndex = indexes.find(({ isLive }) => isLive);
      const isCopying = indexes.some(({ reindexProgress }) => reindexProgress);
      for (const { name, docsCount, isLive } of indexes) {
        if (isLive) {
          continue;
        }
        if (!liveIndex) {
          result.skipped.push({ name, reason: "The collection has no live index" });
        } else if (isCopying) {
          result.skipped.push({ name, reason: "Documents are still being copied" });
        } else if (liveIndex.docsCount < docsCount) {
          result.skipped.push({
            name,
            reason: `The live index has fewer documents (${liveIndex.docsCount} vs ${docsCount})`,
          });
        } else {
          console.log("Deleting orphaned elastic index:", name);
          await client.indices.delete({ index: name });
          result.deleted.push(name);
        }
      }
    }
    return result;
  }

  /**
   * In ElasticSearch, the schema of indexes (called "mappings") is write-only - ie;
   * you can add new fields, but you can't remove fields or change the types of
   * existing fields. This makes experimenting with changes very annoying.
   *
   * To remedy this, we create this indexes with a name tagged with the date of
   * creation (so posts might actually be called posts_1683033972316) and then add an
   * alias for the actual name pointing to the underlining index.
   *
   * To change the schema, we then:
   *  (1) Create a new index with the new schema
   *  (2) Atomically move the alias to the new index, so new writes go there
   *  (3) Make the old index read-only
   *  (4) Copy the existing data into the new index in the background, without
   *      overwriting anything written to the new index since step (2)
   *
   * For a populated index, expect this to take ~a couple of minutes. Note that,
   * for the sake of data safety, the old index is _not_ automatically deleted.
   * You should wait for the copying to complete (see /admin/search-indexes),
   * check that the document count on the new index is >= the document count on
   * the old index, then call `deleteOrphanedIndexes`.
   *
   * Whilst copying, search will continue to work but not all the documents are
   * available - this was ~45 seconds for EA forum prod as of 2023-06-22.
   */
  async configureIndex(collectionName: SearchIndexCollectionName) {
    const client = this.client.getClient();
    const aliasName = getElasticIndexName(collectionName);
    const newIndexName = `${aliasName}_${Date.now()}`;
    const oldIndexName = await this.getExistingAliasTarget(aliasName);

    if (oldIndexName) {
      console.log(`Reindexing index: ${collectionName}`);
      const synonyms = await this.getExistingSynonyms();
      await this.createIndex(newIndexName, collectionName);
      await this.updateSynonymsForIndex(newIndexName, synonyms);
      await client.indices.updateAliases({
        actions: [
          { add: { index: newIndexName, alias: aliasName } },
          { remove: { index: oldIndexName, alias: aliasName } },
        ],
      });
      await client.indices.putSettings({
        index: oldIndexName,
        body: {
          "index.blocks.write": true,
        },
      });
      // Documents written to the new index whilst copying are newer than the
      // copies in the old index, so they mustn't be overwritten
      await client.reindex({
        refresh: true,
        wait_for_completion: false,
        conflicts: "proceed",
        source: { index: oldIndexName },
        dest: { index: newIndexName, op_type: "create" },
      });
    } else {
      console.log(`Creating index: ${collectionName}`);
      await this.createIndex(newIndexName, collectionName);
      await client.indices.putAlias({
        index: newIndexName,
        name: aliasName,
      });
    }
  }

  /**
   * Recreate an index, by creating and configuring a new index, exporting into
   * it, then switching the alias. This will remove any objects that have IDs
   * not present in the postgres DB, eg to clean up search index pollution that
   * was the result of connecting a development DB to a production search index.
   */
  async recreateIndex(collectionName: SearchIndexCollectionName) {
    const client = this.client.getClient();
    const aliasName = getElasticIndexName(collectionName);
    const newIndexName = `${aliasName}_${Date.now()}`;
    const oldIndexName = await this.getExistingAliasTarget(aliasName);

    if (!oldIndexName) {
      throw new Error("Index did not already exist");
    }

    console.log(`Creating index: ${collectionName}`);
    await this.createIndex(newIndexName, collectionName);

    console.log(`Loading data into index: ${collectionName}`);
    await this.exportCollection(collectionName, newIndexName);

    console.log(`Switching alias`);
    await client.indices.putAlias({
      index: newIndexName,
      name: aliasName,
    });
    await client.indices.deleteAlias({
      index: oldIndexName,
      name: aliasName,
    });
  }

  async deleteIndex(collectionName: SearchIndexCollectionName) {
    const aliasName = getElasticIndexName(collectionName);
    const indexName = await this.getExistingAliasTarget(aliasName);
    if (!indexName) {
      throw new Error("Can't find backing index for collection " + collectionName);
    }
    await this.deleteIndexByName(indexName);
  }

  async deleteIndexByName(indexName: string) {
    const client = this.client.getClient();
    await client.indices.delete({
      index: indexName,
    });
  }

  private formatDocument(document: SearchDocument) {
    const id = document._id;
    // @ts-expect-error Sorry
    delete document._id;
    document.publicDateMs = Number(document.publicDateMs);
    // We could strip the HTML inside elastic with the "html_strip" filter, but this
    // is a lot more flexible
    for (const field of HTML_FIELDS) {
      if (field in document) {
        // @ts-expect-error FIXME This is tricky to type correctly
        document[field] = htmlToTextDefault(document[field] ?? "");
      }
    }
    return { id, document };
  }

  async updateDocument(
    collectionName: SearchIndexCollectionName,
    documentId: string,
  ): Promise<void> {
    const index = getElasticIndexName(collectionName);
    const repo = getSearchRepoByCollectionName(collectionName);
    const searchDocument = await repo.fetchById(documentId);
    await this.client.getClient().index({
      index,
      ...this.formatDocument(searchDocument),
    });
  }

  private async getExistingAliasTarget(aliasName: string): Promise<string | null> {
    try {
      const client = this.client.getClient();
      const existing = await client.indices.getAlias({ name: aliasName });
      const oldIndexName = Object.keys(existing ?? {})[0];
      return oldIndexName ?? null;
    } catch {
      return null;
    }
  }

  private async createIndex(
    indexName: string,
    collectionName: SearchIndexCollectionName,
  ): Promise<void> {
    const client = this.client.getClient();
    const mappings = this.getCollectionMappings(collectionName);
    await client.indices.create({
      index: indexName,
      settings: {
        index: {
          analysis: {
            filter: {
              fm_english_stopwords: {
                type: "stop",
                stopwords: "_english_",
              },
              fm_english_stemmer: {
                type: "stemmer",
                language: "english",
              },
              fm_synonym_filter: {
                type: "synonym",
                synonyms: [],
              },
              fm_shingle_filter: {
                type: "shingle",
                min_shingle_size: 2,
                max_shingle_size: 3,
                output_unigrams: true,
              },
              fm_whitespace_filter: {
                type: "pattern_replace",
                pattern: " ",
                replacement: "",
              },
              fm_edge_ngram_filter: {
                type: "edge_ngram",
                min_gram: 1,
                max_gram: 20,
              },
            },
            char_filter: {
              fm_punctuation_filter: {
                type: "pattern_replace",
                pattern: "[()_-]+",
                replacement: " ",
              },
              fm_apostrophe_filter: {
                type: "pattern_replace",
                pattern: "['’]",
                replacement: "",
              },
              fm_word_separator_filter: {
                type: "pattern_replace",
                pattern: "[^\\p{L}\\p{N}]+",
                replacement: " ",
              },
              fm_strip_separators_filter: {
                type: "pattern_replace",
                pattern: "[^\\p{L}\\p{N}]+",
                replacement: "",
              },
            },
            analyzer: {
              default: {
                type: "custom",
                tokenizer: "standard",
                filter: [
                  "lowercase",
                  "decimal_digit",
                  "fm_english_stopwords",
                  "fm_english_stemmer",
                ],
                char_filter: ["fm_punctuation_filter"],
              },
              fm_exact_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "decimal_digit"],
              },
              fm_synonym_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: [
                  "lowercase",
                  "apostrophe",
                  "decimal_digit",
                  "fm_synonym_filter",
                  "fm_english_stopwords",
                  "fm_english_stemmer",
                ],
                char_filter: ["fm_punctuation_filter"],
              },
              fm_shingle_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: [
                  "lowercase",
                  "fm_synonym_filter",
                  "fm_shingle_filter",
                  "fm_whitespace_filter",
                ],
                char_filter: ["fm_punctuation_filter"],
              },
              fm_word_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "asciifolding"],
                char_filter: ["fm_apostrophe_filter", "fm_word_separator_filter"],
              },
              fm_edge_ngram_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "asciifolding", "fm_edge_ngram_filter"],
                char_filter: ["fm_apostrophe_filter", "fm_word_separator_filter"],
              },
            },
            normalizer: {
              fm_sortable_keyword: {
                type: "custom",
                filter: ["lowercase", "trim"],
              },
              fm_compact_keyword: {
                type: "custom",
                filter: ["lowercase", "asciifolding"],
                char_filter: ["fm_strip_separators_filter"],
              },
            },
          },
        },
      },
      mappings: {
        properties: mappings,
      },
    });
  }

  private getCollectionMappings(
    collectionName: SearchIndexCollectionName,
  ): Mappings {
    const config = collectionNameToConfig(collectionName);
    const result: Mappings = {
      objectID: { type: "keyword" },
      publicDateMs: { type: "long" },
      ...config.mappings,
    };
    return result;
  }

  async exportCollection(
    collectionName: SearchIndexCollectionName,
    overrideAlias?: string,
  ) {
    const repo = getSearchRepoByCollectionName(collectionName);
    const indexName = getElasticIndexName(collectionName);
    const alias = overrideAlias ?? (await this.getExistingAliasTarget(indexName));
    if (!alias) {
      throw new Error("Alias is not configured - run `elasticConfigureIndexes`");
    }

    const total = await repo.count();

    console.log(`Exporting ${collectionName} (${total} documents)`);

    const batchSize = 1000;
    const totalBatches = Math.ceil(total / batchSize);
    const totalErrors: helpers.OnDropDocument<SearchDocument>[] = [];
    for (let i = 0; ; i++) {
      const offset = batchSize * i;
      console.log(`...starting ${collectionName} batch ${i} of ${totalBatches}`);
      const documents = await repo.fetchAll(batchSize, offset);
      if (documents.length < 1) {
        break;
      }
      const erroredDocuments = await this.createDocuments(documents, alias);
      totalErrors.push(...erroredDocuments);
    }

    if (totalErrors.length) {
      console.error(`${collectionName} indexing errors:`, totalErrors);
    } else {
      console.log("No errors found when indexing", collectionName);
    }
  }

  private async createDocuments(
    documents: SearchDocument[],
    indexName: string,
  ): Promise<helpers.OnDropDocument<SearchDocument>[]> {
    if (!documents.length) {
      return [];
    }

    const erroredDocuments: helpers.OnDropDocument<SearchDocument>[] = [];
    await this.client.getClient().helpers.bulk({
      datasource: documents,
      onDocument: (document: SearchDocument) => {
        const { id: _id } = this.formatDocument(document);
        return [
          {
            update: { _index: indexName, _id },
          },
          {
            doc_as_upsert: true,
          },
        ];
      },
      onDrop: (doc) => erroredDocuments.push(doc),
    });
    return erroredDocuments;
  }

  async getExistingSynonyms(): Promise<string[]> {
    const client = this.client.getClient();
    const settings = await client.indices.getSettings({
      index: getElasticIndexName("Posts"), // All the indexes use the same synonym list
    });
    const indexName = Object.keys(settings)[0]; // Get the alias target
    const filters = settings[indexName]?.settings?.index?.analysis?.filter;
    const synonymFilter = filters?.fm_synonym_filter;
    if (typeof synonymFilter === "string" || synonymFilter?.type !== "synonym") {
      throw new Error("Invalid synonym filter");
    }
    return synonymFilter.synonyms ?? [];
  }

  async updateSynonyms(synonyms: string[]): Promise<void> {
    await Promise.all(
      searchIndexedCollectionNames.map((collectionName) =>
        this.updateSynonymsForCollection(collectionName, synonyms),
      ),
    );
  }

  private async updateSynonymsForCollection(
    collectionName: SearchIndexCollectionName,
    synonyms: string[],
  ) {
    const index = getElasticIndexName(collectionName);
    await this.updateSynonymsForIndex(index, synonyms);
  }

  private async updateSynonymsForIndex(index: string, synonyms: string[]) {
    const client = this.client.getClient();
    await client.indices.close({ index });
    await client.indices.putSettings({
      index,
      settings: {
        index: {
          analysis: {
            filter: {
              fm_synonym_filter: {
                type: "synonym",
                synonyms,
              },
            },
          },
        },
      },
    });
    await client.indices.open({ index });
  }
}

export default ElasticExporter;
