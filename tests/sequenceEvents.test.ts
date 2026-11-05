import { suite, test, expect } from "vitest";
import { fetchSequenceEventPage } from "@/lib/sequences/sequenceEventQueries";
import { sequenceGetPageUrl } from "@/lib/sequences/sequenceHelpers";
import { scalingSeriesEvent } from "@/lib/sequences/sequenceEvents";
import {
  createTestChapter,
  createTestPost,
  createTestSequence,
} from "./testHelpers";

const createEventSequence = async () => {
  const sequence = await createTestSequence();
  const intro = await createTestPost({ baseScore: 1 });
  const low = await createTestPost({ baseScore: 5 });
  const high = await createTestPost({ baseScore: 50 });
  const draft = await createTestPost({ baseScore: 100, draft: true });
  const rejected = await createTestPost({ baseScore: 100, rejected: true });
  await createTestChapter({
    sequenceId: sequence._id,
    number: 1,
    postIds: [high._id, rejected._id],
  });
  await createTestChapter({
    sequenceId: sequence._id,
    number: 0,
    postIds: [intro._id, low._id, draft._id],
  });
  return { sequence, intro, low, high };
};

suite("fetchSequenceEventPage", () => {
  test("returns visible posts in chapter order", async () => {
    const { sequence, intro, low, high } = await createEventSequence();
    const result = await fetchSequenceEventPage({
      currentUser: null,
      sequenceId: sequence._id,
      order: "sequence",
    });
    expect(result?.posts.map(({ _id }) => _id)).toEqual([
      intro._id,
      low._id,
      high._id,
    ]);
  });
  test("score order keeps the first post and sorts the rest by score", async () => {
    const { sequence, intro, low, high } = await createEventSequence();
    const result = await fetchSequenceEventPage({
      currentUser: null,
      sequenceId: sequence._id,
      order: "score",
    });
    expect(result?.posts.map(({ _id }) => _id)).toEqual([
      intro._id,
      high._id,
      low._id,
    ]);
  });
  test("returns null for a deleted sequence", async () => {
    const sequence = await createTestSequence({ isDeleted: true });
    const result = await fetchSequenceEventPage({
      currentUser: null,
      sequenceId: sequence._id,
      order: "sequence",
    });
    expect(result).toBeNull();
  });
});

suite("sequenceGetPageUrl", () => {
  test("links event sequences to their event page", () => {
    expect(
      sequenceGetPageUrl({ sequence: { _id: scalingSeriesEvent.sequenceId } }),
    ).toBe("/scaling-series");
    expect(sequenceGetPageUrl({ sequence: { _id: "abc" } })).toBe("/s/abc");
  });
});
