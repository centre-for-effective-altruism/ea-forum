import { beforeEach, expect, suite, test, vi } from "vitest";
import {
  ElasticExporter,
  SearchBackingIndexStatus,
  SearchIndexStatus,
} from "@/lib/search/elastic/ElasticExporter";
import type ElasticClient from "@/lib/search/elastic/ElasticClient";

const deleteIndex = vi.fn();

const exporter = new ElasticExporter({
  getClient: () => ({ indices: { delete: deleteIndex } }),
} as unknown as ElasticClient);

const makeIndex = (
  index: Partial<SearchBackingIndexStatus> & { name: string },
): SearchBackingIndexStatus => ({
  createdAt: 0,
  docsCount: 100,
  isLive: false,
  reindexProgress: null,
  ...index,
});

const mockStatuses = (indexes: SearchBackingIndexStatus[]) =>
  vi
    .spyOn(exporter, "getIndexStatuses")
    .mockResolvedValue([
      { collectionName: "Posts", aliasName: "posts", indexes } as SearchIndexStatus,
    ]);

suite("ElasticExporter.deleteOrphanedIndexes", () => {
  beforeEach(() => {
    deleteIndex.mockReset();
  });

  test("Deletes old indexes once the live index has finished copying", async () => {
    mockStatuses([
      makeIndex({ name: "posts_3", isLive: true, docsCount: 101 }),
      makeIndex({ name: "posts_2" }),
      makeIndex({ name: "posts_1" }),
    ]);
    const result = await exporter.deleteOrphanedIndexes();
    expect(result).toEqual({ deleted: ["posts_2", "posts_1"], skipped: [] });
    expect(deleteIndex.mock.calls.map(([{ index }]) => index)).toEqual([
      "posts_2",
      "posts_1",
    ]);
  });

  test("Keeps old indexes whilst documents are being copied", async () => {
    mockStatuses([
      makeIndex({
        name: "posts_2",
        isLive: true,
        docsCount: 10,
        reindexProgress: { copied: 10, total: 100 },
      }),
      makeIndex({ name: "posts_1" }),
    ]);
    const result = await exporter.deleteOrphanedIndexes();
    expect(result.deleted).toEqual([]);
    expect(result.skipped).toEqual([
      { name: "posts_1", reason: "Documents are still being copied" },
    ]);
    expect(deleteIndex).not.toHaveBeenCalled();
  });

  test("Keeps old indexes with more documents than the live index", async () => {
    mockStatuses([
      makeIndex({ name: "posts_2", isLive: true, docsCount: 99 }),
      makeIndex({ name: "posts_1", docsCount: 100 }),
    ]);
    const result = await exporter.deleteOrphanedIndexes();
    expect(result.deleted).toEqual([]);
    expect(result.skipped[0].name).toBe("posts_1");
    expect(deleteIndex).not.toHaveBeenCalled();
  });

  test("Keeps every index when the collection has no live index", async () => {
    mockStatuses([makeIndex({ name: "posts_2" }), makeIndex({ name: "posts_1" })]);
    const result = await exporter.deleteOrphanedIndexes();
    expect(result.deleted).toEqual([]);
    expect(result.skipped.map(({ name }) => name)).toEqual(["posts_2", "posts_1"]);
    expect(deleteIndex).not.toHaveBeenCalled();
  });
});
