import { expect, suite, test } from "vitest";
import {
  SearchPageState,
  buildSearchPageQueries,
  hasActiveSearchFilters,
  parseSearchPageParams,
  serializeSearchPageParams,
} from "@/lib/search/searchPageParams";

const now = new Date("2024-06-15T12:00:00Z");

const buildFirstQuery = (state: SearchPageState) =>
  buildSearchPageQueries(state, 0, now)[0];

const makeState = (state: Partial<SearchPageState> = {}): SearchPageState => ({
  ...parseSearchPageParams(new URLSearchParams()),
  ...state,
});

suite("Search page params", () => {
  suite("parseSearchPageParams", () => {
    test("Falls back to defaults for missing or invalid values", () => {
      expect(
        parseSearchPageParams(
          new URLSearchParams({
            contentType: "Bananas",
            sort: "best",
            date: "decade",
          }),
        ),
      ).toEqual({
        query: "",
        contentType: "Posts",
        sort: "relevance",
        date: "all",
        tags: [],
        curated: false,
        excludeEvents: true,
        core: false,
      });
    });
    test("Ignores sortings that the tab doesn't support", () => {
      const params = new URLSearchParams({
        contentType: "Sequences",
        sort: "karma",
      });
      expect(parseSearchPageParams(params).sort).toBe("relevance");
    });
    test("Round-trips through serialization", () => {
      const state = makeState({
        query: "malaria nets",
        contentType: "Comments",
        sort: "newest_first",
        date: "week",
        tags: ["tag1", "tag2"],
        curated: true,
        excludeEvents: false,
      });
      expect(parseSearchPageParams(serializeSearchPageParams(state))).toEqual(state);
    });
    test("Omits default values when serializing", () => {
      expect(serializeSearchPageParams(makeState({ query: "x" })).toString()).toBe(
        "query=x",
      );
    });
  });

  suite("buildSearchPageQueries", () => {
    test("Encodes the sorting in the index name", () => {
      expect(buildFirstQuery(makeState()).indexName).toBe("posts");
      expect(buildFirstQuery(makeState({ sort: "newest_first" })).indexName).toBe(
        "posts_newest_first",
      );
    });
    test("Excludes events on the posts tab by default", () => {
      const { params } = buildFirstQuery(makeState());
      expect(params.facetFilters).toEqual([["isEvent:false"]]);
    });
    test("Filters posts by tag object ids and comments by plain tag ids", () => {
      const tags = ["a", "b"];
      expect(
        buildFirstQuery(makeState({ tags, excludeEvents: false })).params
          .facetFilters,
      ).toEqual([["tags._id:a", "tags._id:b"]]);
      expect(
        buildFirstQuery(makeState({ contentType: "Comments", tags })).params
          .facetFilters,
      ).toEqual([["tags:a", "tags:b"]]);
    });
    test("Ignores filters that don't apply to the current tab", () => {
      const query = buildFirstQuery(
        makeState({
          contentType: "Tags",
          sort: "karma",
          date: "day",
          tags: ["a"],
          curated: true,
        }),
      );
      expect(query.indexName).toBe("tags");
      expect(query.params.facetFilters).toEqual([]);
      expect(query.params.numericFilters).toEqual([]);
    });
    test("Filters by date relative to the given time", () => {
      const { params } = buildFirstQuery(makeState({ date: "week" }));
      expect(params.numericFilters).toEqual([
        `publicDateMs>=${new Date("2024-06-08T12:00:00Z").getTime()}`,
      ]);
    });
    test("Loads 15 hits first, then splits each later load of 10 into aligned pages", () => {
      const pagesFor = (loadIndex: number) =>
        buildSearchPageQueries(makeState(), loadIndex, now).map(({ params }) => [
          params.page,
          params.hitsPerPage,
        ]);
      expect(pagesFor(0)).toEqual([[0, 15]]);
      expect(pagesFor(1)).toEqual([
        [3, 5],
        [4, 5],
      ]);
      expect(pagesFor(2)).toEqual([
        [5, 5],
        [6, 5],
      ]);
    });
  });

  suite("hasActiveSearchFilters", () => {
    test("Only considers filters that apply to the current tab", () => {
      expect(hasActiveSearchFilters(makeState())).toBe(false);
      expect(hasActiveSearchFilters(makeState({ excludeEvents: false }))).toBe(true);
      expect(
        hasActiveSearchFilters(
          makeState({ contentType: "Tags", tags: ["a"], date: "day" }),
        ),
      ).toBe(false);
    });
  });
});
