import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { postsRouter } from "@/lib/posts/postsRouter";
import { fetchForumFavoritesPostsList } from "@/lib/posts/postLists";
import { upsertReadStatus } from "@/lib/readStatuses/readStatusQueries";
import { createTestPost, createTestUser } from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

const APRIL_FOOLS_TAG_ID = "april-fools-test";

const createFavoriteCandidate = (
  baseScore: number,
  data?: Parameters<typeof createTestPost>[0],
) =>
  createTestPost({
    baseScore,
    frontpageDate: new Date().toISOString(),
    ...data,
  });

const fetchFavoriteIds = async (
  currentUserId: string | null,
  candidateIds: string[],
) => {
  const posts = await fetchForumFavoritesPostsList(currentUserId, 50);
  return posts.map(({ _id }) => _id).filter((id) => candidateIds.includes(id));
};

suite("Recommendations page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APRIL_FOOLS_TAG_ID", APRIL_FOOLS_TAG_ID);
    mockGetCurrentUser.mockResolvedValue(null);
  });

  suite("fetchForumFavoritesPostsList", () => {
    test("returns high karma frontpage posts ordered by karma", async () => {
      const low = await createFavoriteCandidate(100_001);
      const high = await createFavoriteCandidate(100_003);
      const mid = await createFavoriteCandidate(100_002);
      const ids = await fetchFavoriteIds(null, [low._id, mid._id, high._id]);
      expect(ids).toEqual([high._id, mid._id, low._id]);
    });

    test("breaks karma ties in favor of curated posts", async () => {
      const frontpage = await createFavoriteCandidate(100_010);
      const curated = await createFavoriteCandidate(100_010, {
        curatedDate: new Date().toISOString(),
      });
      const ids = await fetchFavoriteIds(null, [frontpage._id, curated._id]);
      expect(ids).toEqual([curated._id, frontpage._id]);
    });

    test("excludes ineligible posts", async () => {
      const eligible = await createFavoriteCandidate(100_020);
      const ineligible = await Promise.all([
        createFavoriteCandidate(50),
        createFavoriteCandidate(100_020, { frontpageDate: null }),
        createFavoriteCandidate(100_020, { meta: true }),
        createFavoriteCandidate(100_020, { disableRecommendation: true }),
        createFavoriteCandidate(100_020, { draft: true }),
        createFavoriteCandidate(100_020, {
          tagRelevance: { [APRIL_FOOLS_TAG_ID]: 1 },
        }),
      ]);
      const ids = await fetchFavoriteIds(null, [
        eligible._id,
        ...ineligible.map(({ _id }) => _id),
      ]);
      expect(ids).toEqual([eligible._id]);
    });

    test("always shows default recommendations first", async () => {
      const top = await createFavoriteCandidate(100_030);
      const defaultRecommendation = await createTestPost({
        baseScore: 1,
        defaultRecommendation: true,
      });
      const ids = await fetchFavoriteIds(null, [top._id, defaultRecommendation._id]);
      expect(ids).toEqual([defaultRecommendation._id, top._id]);
    });

    test("excludes posts the current user has read", async () => {
      const user = await createTestUser();
      const read = await createFavoriteCandidate(100_040);
      const unread = await createFavoriteCandidate(100_040);
      const markedUnread = await createFavoriteCandidate(100_040);
      await upsertReadStatus({
        postId: read._id,
        userId: user._id,
        updateIsReadIfAlreadyExists: true,
      });
      await upsertReadStatus({
        postId: markedUnread._id,
        userId: user._id,
        updateIsReadIfAlreadyExists: true,
        isRead: false,
      });
      const candidateIds = [read._id, unread._id, markedUnread._id];
      expect(new Set(await fetchFavoriteIds(user._id, candidateIds))).toEqual(
        new Set([unread._id, markedUnread._id]),
      );
      expect(new Set(await fetchFavoriteIds(null, candidateIds))).toEqual(
        new Set(candidateIds),
      );
    });
  });

  suite("curated posts list view", () => {
    test("returns curated posts by curated date and paginates", async () => {
      const older = await createTestPost({
        curatedDate: new Date("2100-01-01").toISOString(),
      });
      const newer = await createTestPost({
        curatedDate: new Date("2100-01-02").toISOString(),
      });
      const firstPage = await call(postsRouter.list, { view: "curated", limit: 1 });
      expect(firstPage.map(({ _id }) => _id)).toEqual([newer._id]);
      const secondPage = await call(postsRouter.list, {
        view: "curated",
        limit: 1,
        offset: 1,
      });
      expect(secondPage.map(({ _id }) => _id)).toEqual([older._id]);
    });
  });
});
