import { suite, test, expect } from "vitest";
import {
  createTestChapter,
  createTestPost,
  createTestRevisionFromHtml,
  createTestSequence,
  createTestUser,
} from "./testHelpers";
import { fetchEditorialPageContent } from "@/lib/sequences/editorialPageContentQueries";
import { sequenceGetPageUrl } from "@/lib/sequences/sequenceHelpers";
import {
  scalingSeriesPage,
  type EditorialPageConfig,
} from "@/lib/sequences/editorialPages";

const makeConfig = (
  sequenceId: string,
  postOrder: EditorialPageConfig["postOrder"] = "score",
): EditorialPageConfig => ({
  ...scalingSeriesPage,
  sequenceId,
  postOrder,
});

/** A sequence with three posts spread over two chapters, in descending karma */
const createTestEditorialPage = async (scores = [1, 2, 3]) => {
  const contents = await createTestRevisionFromHtml("<p>A <a>sequence</a></p>");
  const sequence = await createTestSequence({ contentsLatest: contents._id });
  const posts = [];
  for (const baseScore of scores) {
    posts.push(await createTestPost({ baseScore }));
  }
  await createTestChapter({
    sequenceId: sequence._id,
    number: 1,
    postIds: [posts[0]._id, posts[1]._id],
  });
  await createTestChapter({
    sequenceId: sequence._id,
    number: 2,
    postIds: [posts[2]._id],
  });
  return { sequence, posts };
};

suite("fetchEditorialPageContent", () => {
  test("returns the sequence with its description", async () => {
    const { sequence } = await createTestEditorialPage();
    const data = await fetchEditorialPageContent({
      currentUser: null,
      config: makeConfig(sequence._id),
    });
    expect(data?.sequence._id).toBe(sequence._id);
    expect(data?.sequence.title).toBe(sequence.title);
    expect(data?.sequence.contentsRevision?.html).toBe("<p>A <a>sequence</a></p>");
  });
  test("pins the first post and orders the rest by karma", async () => {
    const { sequence, posts } = await createTestEditorialPage([1, 2, 3]);
    const data = await fetchEditorialPageContent({
      currentUser: null,
      config: makeConfig(sequence._id, "score"),
    });
    expect(data?.posts.map(({ _id }) => _id)).toEqual([
      posts[0]._id,
      posts[2]._id,
      posts[1]._id,
    ]);
  });
  test("can keep the sequence's own post order", async () => {
    const { sequence, posts } = await createTestEditorialPage([1, 2, 3]);
    const data = await fetchEditorialPageContent({
      currentUser: null,
      config: makeConfig(sequence._id, "sequence"),
    });
    expect(data?.posts.map(({ _id }) => _id)).toEqual(posts.map(({ _id }) => _id));
  });
  test("returns null for a sequence that isn't visible", async () => {
    const sequence = await createTestSequence({ draft: true });
    const config = makeConfig(sequence._id);
    expect(
      await fetchEditorialPageContent({ currentUser: null, config }),
    ).toBeNull();
    const admin = await createTestUser({ isAdmin: true });
    const asAdmin = await fetchEditorialPageContent({ currentUser: admin, config });
    expect(asAdmin?.sequence._id).toBe(sequence._id);
  });
  test("returns null for a sequence that doesn't exist", async () => {
    const data = await fetchEditorialPageContent({
      currentUser: null,
      config: makeConfig("thisIsNotASequence"),
    });
    expect(data).toBeNull();
  });
});

suite("sequenceGetPageUrl", () => {
  test("links sequences with a landing page to that page", () => {
    expect(
      sequenceGetPageUrl({ sequence: { _id: scalingSeriesPage.sequenceId } }),
    ).toBe("/scaling-series");
  });
  test("links other sequences to the normal sequence page", () => {
    expect(sequenceGetPageUrl({ sequence: { _id: "someSequenceId" } })).toBe(
      "/s/someSequenceId",
    );
  });
});
