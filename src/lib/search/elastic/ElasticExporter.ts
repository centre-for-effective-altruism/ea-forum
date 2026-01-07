/* eslint-disable no-console */

import { helpers } from "@elastic/elasticsearch";
import { htmlToTextDefault } from "@/lib/utils/htmlToText";
import ElasticClient from "./ElasticClient";
import type { SearchDocument } from "../searchDocuments";
import { collectionNameToConfig, Mappings } from "./ElasticConfig";
import { getSearchRepoByCollectionName } from "./fetchSearchDocuments";
import {
  getSearchIndexName,
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

  async exportAll() {
    await Promise.all(
      searchIndexedCollectionNames.map((collectionName) =>
        this.exportCollection(collectionName),
      ),
    );
  }

  private isBackingIndexName(name: string): boolean {
    for (const collectionName of searchIndexedCollectionNames) {
      if (
        name.indexOf(collectionName.toLowerCase()) === 0 &&
        /[a-z]+_\d+/.exec(name)?.length
      ) {
        return true;
      }
    }
    return false;
  }

  async deleteOrphanedIndexes() {
    const client = this.client.getClient();
    const indexes = await client.indices.get({
      index: "*",
    });
    const indexNames = Object.keys(indexes);
    for (const indexName of indexNames) {
      if (!this.isBackingIndexName(indexName)) {
        continue;
      }

      const aliasName = /([a-z]+)_\d+/.exec(indexName)?.[1];
      if (!aliasName) {
        continue;
      }
      const targetName = await this.getExistingAliasTarget(aliasName);
      if (targetName === indexName) {
        continue;
      }
      console.log("Deleting orphaned elastic index:", indexName);
      await client.indices.delete({
        index: indexName,
      });
    }
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
   *  (1) Make the old index read-only
   *  (2) Reindex all of the existing data into a new index with the new schema
   *  (3) Mark the new index as writable
   *  (4) Update the alias to point to the new index
   *
   * For a populated index, expect this to take ~a couple of minutes. Note that,
   * for the sake of data safety, the old index is _not_ automatically deleted.
   * You should wait a couple of minutes for the reindexing to complete, check
   * that the document count on the new index is >= the document count on the old
   * index, then run `Globals.elasticDeleteOrphanedIndexes()`.
   *
   * Whilst exporting, there'll be a short period during copying where search
   * will continue to work but not all the documents are available - this is
   * currently ~45 seconds for EA forum prod as of 2023-06-22.
   */
  async configureIndex(collectionName: SearchIndexCollectionName) {
    const client = this.client.getClient();
    const aliasName = getSearchIndexName(collectionName);
    const newIndexName = `${aliasName}_${Date.now()}`;
    const oldIndexName = await this.getExistingAliasTarget(aliasName);

    if (oldIndexName) {
      console.log(`Reindexing index: ${collectionName}`);
      const synonyms = await this.getExistingSynonyms();
      await client.indices.putSettings({
        index: oldIndexName,
        body: {
          "index.blocks.write": true,
        },
      });
      await this.createIndex(newIndexName, collectionName);
      await this.updateSynonymsForIndex(newIndexName, synonyms);
      await client.reindex({
        refresh: true,
        wait_for_completion: false,
        source: { index: oldIndexName },
        dest: { index: newIndexName },
      });
      await client.indices.putSettings({
        index: newIndexName,
        body: {
          "index.blocks.write": false,
        },
      });
      await client.indices.putAlias({
        index: newIndexName,
        name: aliasName,
      });
      await client.indices.deleteAlias({
        index: oldIndexName,
        name: aliasName,
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
    const aliasName = getSearchIndexName(collectionName);
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
    const aliasName = getSearchIndexName(collectionName);
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
        document[f] = htmlToTextDefault(document[f] ?? "");
      }
    }
    return { id, document };
  }

  async updateDocument(
    collectionName: SearchIndexCollectionName,
    documentId: string,
  ): Promise<void> {
    const index = collectionName.toLowerCase();
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
            },
            char_filter: {
              fm_punctuation_filter: {
                type: "pattern_replace",
                pattern: "[()_-]+",
                replacement: " ",
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
            },
            normalizer: {
              fm_sortable_keyword: {
                type: "custom",
                filter: ["lowercase", "trim"],
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
    const indexName = getSearchIndexName(collectionName);
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
      index: "posts", // All the indexes use the same synonym list
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
    const index = getSearchIndexName(collectionName);
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
