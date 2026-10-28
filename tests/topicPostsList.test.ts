import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { fetchTagPostsList } from "@/lib/posts/postLists";
import { postsRouter } from "@/lib/posts/postsRouter";
import { createTestGroup, createTestPost, createTestTag } from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

const day = (n: number) => new Date(Date.UTC(2020, 0, n)).toISOString();

const createTaggedPosts = async () => {
  const tag = await createTestTag();
  const tagged = (score: number, data: Parameters<typeof createTestPost>[0]) =>
    createTestPost({ tagRelevance: { [tag._id]: score }, ...data });
  const a = await tagged(1, {
    baseScore: 50,
    postedAt: day(1),
    lastCommentedAt: day(5),
  });
  const b = await tagged(5, {
    baseScore: 10,
    postedAt: day(3),
    lastCommentedAt: day(3),
  });
  const c = await tagged(3, {
    baseScore: 30,
    postedAt: day(2),
    lastCommentedAt: day(9),
  });
  const d = await tagged(3, {
    baseScore: 40,
    postedAt: day(4),
    lastCommentedAt: day(1),
  });
  return { tag, a, b, c, d };
};

const ids = (posts: { _id: string }[]) => posts.map(({ _id }) => _id);

suite("Topic posts list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(null);
  });

  test("Only returns viewable posts with a relevance of at least 1", async () => {
    const tag = await createTestTag();
    const otherTag = await createTestTag();
    const group = await createTestGroup({});
    const included = await createTestPost({ tagRelevance: { [tag._id]: 1 } });
    const event = await createTestPost({
      tagRelevance: { [tag._id]: 2 },
      isEvent: true,
    });
    await Promise.all([
      createTestPost({ tagRelevance: { [tag._id]: 0 } }),
      createTestPost({ tagRelevance: { [tag._id]: -2 } }),
      createTestPost({ tagRelevance: { [otherTag._id]: 5 } }),
      createTestPost(),
      createTestPost({ tagRelevance: { [tag._id]: 5 }, draft: true }),
      createTestPost({ tagRelevance: { [tag._id]: 5 }, rejected: true }),
      createTestPost({ tagRelevance: { [tag._id]: 5 }, shortform: true }),
      createTestPost({ tagRelevance: { [tag._id]: 5 }, groupId: group._id }),
    ]);
    const posts = await fetchTagPostsList({
      currentUser: null,
      tagId: tag._id,
      sortedBy: "new",
    });
    expect(ids(posts).sort()).toEqual([included._id, event._id].sort());
  });

  test("Sorts by relevance, then karma", async () => {
    const { tag, a, b, c, d } = await createTaggedPosts();
    const posts = await fetchTagPostsList({
      currentUser: null,
      tagId: tag._id,
      sortedBy: "relevance",
    });
    expect(ids(posts)).toEqual([b._id, d._id, c._id, a._id]);
  });

  test.each([
    ["top", ["a", "d", "c", "b"]],
    ["new", ["d", "b", "c", "a"]],
    ["old", ["a", "c", "b", "d"]],
    ["recentComments", ["c", "a", "b", "d"]],
  ] as const)("Sorts by %s", async (sortedBy, expected) => {
    const created = await createTaggedPosts();
    const posts = await fetchTagPostsList({
      currentUser: null,
      tagId: created.tag._id,
      sortedBy,
    });
    expect(ids(posts)).toEqual(expected.map((key) => created[key]._id));
  });

  test.each(["magic", "topAdjusted"] as const)(
    "Returns all tagged posts when sorting by %s",
    async (sortedBy) => {
      const { tag, a, b, c, d } = await createTaggedPosts();
      const posts = await fetchTagPostsList({
        currentUser: null,
        tagId: tag._id,
        sortedBy,
      });
      expect(ids(posts).sort()).toEqual(ids([a, b, c, d]).sort());
    },
  );

  test("Applies offset and limit", async () => {
    const { tag, a, b, c, d } = await createTaggedPosts();
    const [first, second] = await Promise.all([
      fetchTagPostsList({
        currentUser: null,
        tagId: tag._id,
        sortedBy: "top",
        limit: 2,
      }),
      fetchTagPostsList({
        currentUser: null,
        tagId: tag._id,
        sortedBy: "top",
        limit: 2,
        offset: 2,
      }),
    ]);
    expect(ids(first)).toEqual([a._id, d._id]);
    expect(ids(second)).toEqual([c._id, b._id]);
  });

  test("listForTag RPC paginates tagged posts", async () => {
    const { tag, a, c, d } = await createTaggedPosts();
    const posts = await call(postsRouter.listForTag, {
      tagId: tag._id,
      sortedBy: "relevance",
      limit: 2,
      offset: 1,
    });
    expect(ids(posts)).toEqual([d._id, c._id]);
    const rest = await call(postsRouter.listForTag, {
      tagId: tag._id,
      sortedBy: "relevance",
      offset: 3,
    });
    expect(ids(rest)).toEqual([a._id]);
  });

  test("listForTag RPC rejects invalid input", async () => {
    const tag = await createTestTag();
    await expect(
      call(postsRouter.listForTag, { tagId: tag._id, sortedBy: "top", limit: 51 }),
    ).rejects.toThrow();
    await expect(
      call(postsRouter.listForTag, { tagId: tag._id, sortedBy: "top", offset: -1 }),
    ).rejects.toThrow();
    await expect(
      call(postsRouter.listForTag, {
        tagId: tag._id,
        sortedBy: "invalid" as "top",
      }),
    ).rejects.toThrow();
  });
});
