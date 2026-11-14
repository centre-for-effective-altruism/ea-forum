import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { db } from "@/lib/db";
import { marginalFundingWeekAdminRouter } from "@/lib/marginalFundingWeekAdmin/marginalFundingWeekAdminRouter";
import { fetchMarginalFundingWeekAdminData } from "@/lib/marginalFundingWeekAdmin/marginalFundingWeekAdminQueries";
import {
  createTestChapter,
  createTestPost,
  createTestSequence,
  createTestTag,
  createTestUser,
} from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mfwConfig = vi.hoisted(() => ({ sequenceId: "", tagSlug: "" }));

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => ({
  ...(await importOriginal()),
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock(import("@vercel/functions"), async (importOriginal) => ({
  ...(await importOriginal()),
  waitUntil: () => {},
}));

vi.mock("@/lib/marginalFundingWeek", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/marginalFundingWeek")>();
  return {
    ...actual,
    get marginalFundingWeekSequenceId() {
      return mfwConfig.sequenceId;
    },
    get marginalFundingWeekTagSlug() {
      return mfwConfig.tagSlug;
    },
  };
});

const setSequencePosts = (postIds: string[]) =>
  call(marginalFundingWeekAdminRouter.setSequencePosts, { postIds });

const fetchChapters = () =>
  db.query.chapters.findMany({ where: { sequenceId: mfwConfig.sequenceId } });

suite("Marginal Funding Week admin", () => {
  beforeEach(async () => {
    const admin = await createTestUser({ isAdmin: true });
    mockGetCurrentUser.mockResolvedValue(admin);
    const sequence = await createTestSequence({ userId: admin._id });
    mfwConfig.sequenceId = sequence._id;
  });

  test("Non-admins can't edit the sequence", async () => {
    mockGetCurrentUser.mockResolvedValue(await createTestUser());
    const post = await createTestPost();
    await expect(setSequencePosts([post._id])).rejects.toThrow("Permission denied");
    expect(await fetchChapters()).toHaveLength(0);
  });

  test("Creates a chapter when the sequence has none", async () => {
    const [a, b] = await Promise.all([createTestPost(), createTestPost()]);
    await setSequencePosts([b._id, a._id]);
    const chapters = await fetchChapters();
    expect(chapters).toHaveLength(1);
    expect(chapters[0].postIds).toEqual([b._id, a._id]);
  });

  test("Edits the existing chapter", async () => {
    const [a, b] = await Promise.all([createTestPost(), createTestPost()]);
    const chapter = await createTestChapter({
      sequenceId: mfwConfig.sequenceId,
      postIds: [a._id],
    });
    await setSequencePosts([b._id]);
    const chapters = await fetchChapters();
    expect(chapters.map(({ _id, postIds }) => ({ _id, postIds }))).toEqual([
      { _id: chapter._id, postIds: [b._id] },
    ]);
  });

  test("Lists tagged posts along with untagged posts in the sequence", async () => {
    const tag = await createTestTag();
    mfwConfig.tagSlug = tag.slug;
    const tagged = await createTestPost({ tagRelevance: { [tag._id]: 1 } });
    const sequenced = await createTestPost();
    await createTestPost();
    await createTestChapter({
      sequenceId: mfwConfig.sequenceId,
      postIds: [sequenced._id],
    });
    const data = await fetchMarginalFundingWeekAdminData();
    expect(data.tagFound).toBe(true);
    expect(data.sequencePostIds).toEqual([sequenced._id]);
    expect(data.posts.map(({ _id }) => _id).sort()).toEqual(
      [tagged._id, sequenced._id].sort(),
    );
  });
});
