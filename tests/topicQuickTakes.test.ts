import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import {
  countTagDiscussionComments,
  countTagQuickTakes,
  fetchTagQuickTakes,
} from "@/lib/comments/commentLists";
import { commentsRouter } from "@/lib/comments/commentsRouter";
import {
  createTestComment,
  createTestPost,
  createTestTag,
  createTestUser,
} from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

const createQuickTake = async (
  tagId: string,
  data?: Parameters<typeof createTestComment>[0],
) => {
  const userId = data?.userId ?? (await createTestUser())._id;
  const shortformPost = await createTestPost({ userId, shortform: true });
  return createTestComment({
    userId,
    postId: shortformPost._id,
    shortform: true,
    relevantTagIds: [tagId],
    ...data,
  });
};

const timestamp = (offsetSeconds: number) =>
  new Date(
    Date.parse("2100-01-01T00:00:00.000Z") + offsetSeconds * 1000,
  ).toISOString();

suite("Topic quick takes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(null);
  });

  test("Only includes top-level, non-deleted quick takes tagged with the topic", async () => {
    const tag = await createTestTag();
    const otherTag = await createTestTag();
    const included = await createQuickTake(tag._id);
    await createQuickTake(otherTag._id);
    await createQuickTake(tag._id, { deleted: true });
    await createQuickTake(tag._id, { shortform: false });
    await createQuickTake(tag._id, { parentCommentId: included._id });
    await createTestComment({
      tagId: tag._id,
      tagCommentType: "SUBFORUM",
      shortform: true,
    });

    const quickTakes = await fetchTagQuickTakes({
      currentUser: null,
      tagId: tag._id,
    });
    expect(quickTakes.map(({ _id }) => _id)).toEqual([included._id]);
    expect(await countTagQuickTakes({ currentUser: null, tagId: tag._id })).toBe(1);
  });

  test("Excludes quick takes that aren't viewable", async () => {
    const tag = await createTestTag();
    const author = await createTestUser();
    const draft = await createQuickTake(tag._id, {
      userId: author._id,
      draft: true,
    });
    await createQuickTake(tag._id, { rejected: true });

    expect(await fetchTagQuickTakes({ currentUser: null, tagId: tag._id })).toEqual(
      [],
    );
    const authorQuickTakes = await fetchTagQuickTakes({
      currentUser: author,
      tagId: tag._id,
    });
    expect(authorQuickTakes.map(({ _id }) => _id)).toEqual([draft._id]);
  });

  test("Orders newest first and supports offset and limit", async () => {
    const tag = await createTestTag();
    const quickTakes = [];
    for (let i = 0; i < 5; i++) {
      quickTakes.push(await createQuickTake(tag._id, { postedAt: timestamp(i) }));
    }
    const newestFirst = quickTakes.map(({ _id }) => _id).reverse();

    const all = await fetchTagQuickTakes({ currentUser: null, tagId: tag._id });
    expect(all.map(({ _id }) => _id)).toEqual(newestFirst);

    const page = await fetchTagQuickTakes({
      currentUser: null,
      tagId: tag._id,
      offset: 2,
      limit: 2,
    });
    expect(page.map(({ _id }) => _id)).toEqual(newestFirst.slice(2, 4));
  });

  test("listTagQuickTakes paginates and only counts on the first page", async () => {
    const tag = await createTestTag();
    const quickTakes = [];
    for (let i = 0; i < 3; i++) {
      quickTakes.push(await createQuickTake(tag._id, { postedAt: timestamp(i) }));
    }
    const newestFirst = quickTakes.map(({ _id }) => _id).reverse();

    const first = await call(commentsRouter.listTagQuickTakes, {
      tagId: tag._id,
      limit: 2,
    });
    expect(first.items.map(({ _id }) => _id)).toEqual(newestFirst.slice(0, 2));
    expect(first.totalCount).toBe(3);

    const second = await call(commentsRouter.listTagQuickTakes, {
      tagId: tag._id,
      limit: 2,
      offset: 2,
    });
    expect(second.items.map(({ _id }) => _id)).toEqual(newestFirst.slice(2));
    expect(second.totalCount).toBeUndefined();
  });

  test("Counts viewable, non-deleted discussion comments for the topic", async () => {
    const tag = await createTestTag();
    const otherTag = await createTestTag();
    await createTestComment({ tagId: tag._id, tagCommentType: "DISCUSSION" });
    await createTestComment({ tagId: tag._id, tagCommentType: "DISCUSSION" });
    await createTestComment({
      tagId: tag._id,
      tagCommentType: "DISCUSSION",
      deleted: true,
    });
    await createTestComment({
      tagId: tag._id,
      tagCommentType: "DISCUSSION",
      rejected: true,
    });
    await createTestComment({ tagId: tag._id, tagCommentType: "SUBFORUM" });
    await createTestComment({
      tagId: otherTag._id,
      tagCommentType: "DISCUSSION",
    });

    expect(
      await countTagDiscussionComments({ currentUser: null, tagId: tag._id }),
    ).toBe(2);
  });
});
