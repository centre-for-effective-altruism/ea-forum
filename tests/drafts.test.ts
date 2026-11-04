import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { postsRouter } from "@/lib/posts/postsRouter";
import { fetchDraftsListPosts } from "@/lib/posts/postLists";
import {
  DraftsListSettings,
  resolveDraftsListSettings,
} from "@/lib/posts/draftsListSettings";
import { createTestPost, createTestUser } from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

const defaultSettings: DraftsListSettings = {
  sortDraftsBy: "lastModified",
  includeArchived: false,
  includeShared: true,
};

const createDraft = (data: Parameters<typeof createTestPost>[0]) =>
  createTestPost({ draft: true, ...data });

const fetchDraftIds = async (
  userId: string,
  settings: Partial<DraftsListSettings>,
) => {
  const drafts = await fetchDraftsListPosts({
    currentUserId: userId,
    settings: { ...defaultSettings, ...settings },
  });
  return drafts.map(({ _id }) => _id);
};

suite("Drafts page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  suite("resolveDraftsListSettings", () => {
    const noUserSettings = {
      draftsListSorting: null,
      draftsListShowArchived: null,
      draftsListShowShared: null,
    };

    test("defaults to last modified, hiding archived and showing shared", () => {
      expect(resolveDraftsListSettings({}, noUserSettings)).toEqual(defaultSettings);
    });

    test("uses saved user settings when there are no query params", () => {
      expect(
        resolveDraftsListSettings(
          {},
          {
            draftsListSorting: "newest",
            draftsListShowArchived: true,
            draftsListShowShared: false,
          },
        ),
      ).toEqual({
        sortDraftsBy: "newest",
        includeArchived: true,
        includeShared: false,
      });
    });

    test("query params override saved user settings", () => {
      expect(
        resolveDraftsListSettings(
          {
            sortDraftsBy: "oldest",
            includeArchived: "false",
            includeShared: "true",
          },
          {
            draftsListSorting: "newest",
            draftsListShowArchived: true,
            draftsListShowShared: false,
          },
        ),
      ).toEqual({
        sortDraftsBy: "oldest",
        includeArchived: false,
        includeShared: true,
      });
    });

    test("ignores invalid values", () => {
      expect(
        resolveDraftsListSettings(
          { sortDraftsBy: "nonsense", includeArchived: "maybe" },
          { ...noUserSettings, draftsListSorting: "alsoNonsense" },
        ),
      ).toEqual(defaultSettings);
    });
  });

  suite("fetchDraftsListPosts", () => {
    test("filters by ownership, sharing and archived status", async () => {
      const user = await createTestUser();
      const other = await createTestUser();
      const own = await createDraft({ userId: user._id });
      const archived = await createDraft({ userId: user._id, deletedDraft: true });
      const shared = await createDraft({
        userId: other._id,
        shareWithUsers: [user._id],
      });
      const coauthored = await createDraft({
        userId: other._id,
        coauthorUserIds: [user._id],
      });
      await createDraft({ userId: other._id });
      await createTestPost({ userId: user._id, draft: false });

      expect(new Set(await fetchDraftIds(user._id, {}))).toEqual(
        new Set([own._id, shared._id, coauthored._id]),
      );
      expect(await fetchDraftIds(user._id, { includeShared: false })).toEqual([
        own._id,
      ]);
      expect(
        new Set(
          await fetchDraftIds(user._id, {
            includeShared: false,
            includeArchived: true,
          }),
        ),
      ).toEqual(new Set([own._id, archived._id]));
    });

    test("sorts by last modified or created date", async () => {
      const user = await createTestUser();
      const oldUnmodified = await createDraft({
        userId: user._id,
        createdAt: "2020-01-01T00:00:00Z",
      });
      const oldRecentlyModified = await createDraft({
        userId: user._id,
        createdAt: "2020-01-02T00:00:00Z",
        modifiedAt: "2025-01-01T00:00:00Z",
      });
      const newer = await createDraft({
        userId: user._id,
        createdAt: "2021-01-01T00:00:00Z",
        modifiedAt: "2021-01-01T00:00:00Z",
      });

      expect(
        await fetchDraftIds(user._id, { sortDraftsBy: "lastModified" }),
      ).toEqual([oldRecentlyModified._id, newer._id, oldUnmodified._id]);
      expect(await fetchDraftIds(user._id, { sortDraftsBy: "newest" })).toEqual([
        newer._id,
        oldRecentlyModified._id,
        oldUnmodified._id,
      ]);
      expect(await fetchDraftIds(user._id, { sortDraftsBy: "oldest" })).toEqual([
        oldUnmodified._id,
        oldRecentlyModified._id,
        newer._id,
      ]);
    });
  });

  suite("restoreDraft", () => {
    test("restores an archived draft for its author", async () => {
      const user = await createTestUser();
      const post = await createDraft({ userId: user._id, deletedDraft: true });
      mockGetCurrentUser.mockResolvedValue(user);

      await call(postsRouter.restoreDraft, { postId: post._id });

      const updated = await db.query.posts.findFirst({
        columns: { draft: true, deletedDraft: true },
        where: { _id: post._id },
      });
      expect(updated).toEqual({ draft: true, deletedDraft: false });
    });

    test("rejects users who aren't the author", async () => {
      const user = await createTestUser();
      const post = await createDraft({
        userId: (await createTestUser())._id,
        shareWithUsers: [user._id],
        deletedDraft: true,
      });
      mockGetCurrentUser.mockResolvedValue(user);

      await expect(
        call(postsRouter.restoreDraft, { postId: post._id }),
      ).rejects.toThrow("Permission denied");
      const [unchanged] = await db
        .select({ deletedDraft: posts.deletedDraft })
        .from(posts)
        .where(eq(posts._id, post._id));
      expect(unchanged.deletedDraft).toBe(true);
    });
  });
});
