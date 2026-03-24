import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { db } from "@/lib/db";
import { moderationRouter } from "@/lib/moderation/moderationRouter";
import { lwEvents, moderatorActions } from "@/lib/schema";
import { randomId } from "@/lib/utils/random";
import { createTestComment, createTestPost, createTestUser } from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

suite("moderationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(null);
  });

  test("listModeratorComments paginates moderator comments", async () => {
    const author = await createTestUser();
    const post = await createTestPost({ userId: author._id });

    const base = Date.parse("2100-01-01T00:00:00.000Z");
    await Promise.all(
      Array.from({ length: 21 }).map((_, idx) =>
        createTestComment({
          userId: author._id,
          postId: post._id,
          moderatorHat: true,
          draft: false,
          deleted: false,
          postedAt: new Date(base + idx * 1000).toISOString(),
        }),
      ),
    );

    const [page1, page2] = await Promise.all([
      call(moderationRouter.listModeratorComments, { page: 1 }),
      call(moderationRouter.listModeratorComments, { page: 2 }),
    ]);

    expect(page1.comments.length).toBe(10);
    expect(page2.comments.length).toBeGreaterThanOrEqual(1);
    expect(page1.count).toBeGreaterThanOrEqual(21);
    expect(page1.comments[0]).toHaveProperty("html");
    expect(page1.comments[0]).toHaveProperty("post");
  });

  test("listModeratorComments count excludes moderator comments on non-viewable posts for public viewers", async () => {
    const before = await call(moderationRouter.listModeratorComments, { page: 1 });
    const author = await createTestUser();
    const visiblePost = await createTestPost({ userId: author._id });
    const draftPost = await createTestPost({ userId: author._id, draft: true });
    const rejectedPost = await createTestPost({
      userId: author._id,
      rejected: true,
    });
    const unlistedPost = await createTestPost({
      userId: author._id,
      unlisted: true,
    });
    const futurePost = await createTestPost({
      userId: author._id,
      isFuture: true,
      postedAt: "2200-01-01T00:00:00.000Z",
    });
    const base = Date.parse("2200-01-01T00:00:00.000Z");

    const insertedComments = await Promise.all([
      createTestComment({
        userId: author._id,
        postId: visiblePost._id,
        moderatorHat: true,
        draft: false,
        deleted: false,
        postedAt: new Date(base + 1000).toISOString(),
      }),
      createTestComment({
        userId: author._id,
        postId: visiblePost._id,
        moderatorHat: true,
        draft: false,
        deleted: false,
        postedAt: new Date(base + 2000).toISOString(),
      }),
      createTestComment({
        userId: author._id,
        postId: visiblePost._id,
        moderatorHat: true,
        draft: false,
        deleted: false,
        postedAt: new Date(base + 3000).toISOString(),
      }),
      createTestComment({
        userId: author._id,
        postId: draftPost._id,
        moderatorHat: true,
        draft: false,
        deleted: false,
        postedAt: new Date(base + 4000).toISOString(),
      }),
      createTestComment({
        userId: author._id,
        postId: rejectedPost._id,
        moderatorHat: true,
        draft: false,
        deleted: false,
        postedAt: new Date(base + 5000).toISOString(),
      }),
      createTestComment({
        userId: author._id,
        postId: unlistedPost._id,
        moderatorHat: true,
        draft: false,
        deleted: false,
        postedAt: new Date(base + 6000).toISOString(),
      }),
      createTestComment({
        userId: author._id,
        postId: futurePost._id,
        moderatorHat: true,
        draft: false,
        deleted: false,
        postedAt: new Date(base + 7000).toISOString(),
      }),
    ]);

    const data = await call(moderationRouter.listModeratorComments, { page: 1 });
    const insertedVisibleIds = new Set(
      insertedComments
        .filter((comment) => comment.postId === visiblePost._id)
        .map((comment) => comment._id),
    );
    const hiddenCommentIds = new Set(
      insertedComments
        .filter((comment) => comment.postId !== visiblePost._id)
        .map((comment) => comment._id),
    );

    expect(data.count).toBe(before.count + 3);
    expect(
      data.comments.filter((comment) => insertedVisibleIds.has(comment._id)),
    ).toHaveLength(3);
    expect(
      data.comments.filter((comment) => hiddenCommentIds.has(comment._id)),
    ).toHaveLength(0);
  });

  test("listDeletedComments hides deleted users for public viewers and includes them for admins", async () => {
    const author = await createTestUser();
    const deletedModerator = await createTestUser({ deleted: true });
    await createTestComment({
      userId: author._id,
      postId: (await createTestPost({ userId: author._id }))._id,
      deleted: true,
      deletedPublic: true,
      deletedByUserId: deletedModerator._id,
      deletedDate: "2200-01-01T00:00:00.000Z",
    });

    const publicData = await call(moderationRouter.listDeletedComments, { page: 1 });
    expect(publicData.deletedByUsersMap[deletedModerator._id]).toBeUndefined();

    mockGetCurrentUser.mockResolvedValue(await createTestUser({ isAdmin: true }));
    const adminData = await call(moderationRouter.listDeletedComments, { page: 1 });

    expect(adminData.deletedByUsersMap[deletedModerator._id]).toMatchObject({
      _id: deletedModerator._id,
      deleted: true,
    });
  });

  test("listDeletedComments only resolves post links for publicly visible posts", async () => {
    const author = await createTestUser();
    const visiblePost = await createTestPost({ userId: author._id });
    const draftPost = await createTestPost({ userId: author._id, draft: true });
    const rejectedPost = await createTestPost({
      userId: author._id,
      rejected: true,
    });
    const unlistedPost = await createTestPost({
      userId: author._id,
      unlisted: true,
    });
    const futurePost = await createTestPost({
      userId: author._id,
      isFuture: true,
      postedAt: "2200-01-01T00:00:00.000Z",
    });

    const comments = await Promise.all([
      createTestComment({
        userId: author._id,
        postId: visiblePost._id,
        deleted: true,
        deletedPublic: true,
        deletedDate: "2200-01-01T00:00:00.000Z",
      }),
      createTestComment({
        userId: author._id,
        postId: draftPost._id,
        deleted: true,
        deletedPublic: true,
        deletedDate: "2200-01-01T00:01:00.000Z",
      }),
      createTestComment({
        userId: author._id,
        postId: rejectedPost._id,
        deleted: true,
        deletedPublic: true,
        deletedDate: "2200-01-01T00:02:00.000Z",
      }),
      createTestComment({
        userId: author._id,
        postId: unlistedPost._id,
        deleted: true,
        deletedPublic: true,
        deletedDate: "2200-01-01T00:03:00.000Z",
      }),
      createTestComment({
        userId: author._id,
        postId: futurePost._id,
        deleted: true,
        deletedPublic: true,
        deletedDate: "2200-01-01T00:04:00.000Z",
      }),
    ]);

    const data = await call(moderationRouter.listDeletedComments, { page: 1 });
    const commentIds = new Set(comments.map((comment) => comment._id));
    const relevantComments = data.comments.filter((comment) =>
      commentIds.has(comment._id),
    );

    expect(relevantComments).toHaveLength(5);
    expect(data.postMap[visiblePost._id]).toMatchObject({ _id: visiblePost._id });
    expect(data.postMap[draftPost._id]).toBeUndefined();
    expect(data.postMap[rejectedPost._id]).toBeUndefined();
    expect(data.postMap[unlistedPost._id]).toBeUndefined();
    expect(data.postMap[futurePost._id]).toBeUndefined();
  });

  test("mod-only actions reject non-admin users", async () => {
    const nonAdminUser = await createTestUser({ isAdmin: false, groups: [] });
    mockGetCurrentUser.mockResolvedValue(nonAdminUser);

    await expect(
      call(moderationRouter.listModeratorActions, { page: 1 }),
    ).rejects.toThrow("Forbidden");
  });

  test("auto rate limits respect showExpired/showNewUser filters", async () => {
    const establishedUser = await createTestUser({ postCount: 6, commentCount: 0 });
    const newUser = await createTestUser({ postCount: 0, commentCount: 0 });
    const expiredUser = await createTestUser({ postCount: 6, commentCount: 0 });

    const activatedProps = {
      actionType: "Comments",
      rateLimitType: "lowKarma",
      rateLimitCategory: "rolling",
      itemsPerTimeframe: 1,
      timeframeLength: 1,
      timeframeUnit: "days",
      rateLimitMessage: "Limited",
      triggeredAt: "2200-01-01T00:00:00.000Z",
    };

    await db.insert(lwEvents).values([
      {
        _id: randomId(),
        userId: establishedUser._id,
        name: "rateLimitActivated",
        properties: activatedProps,
        createdAt: "2200-01-01T00:00:00.000Z",
      },
      {
        _id: randomId(),
        userId: newUser._id,
        name: "rateLimitActivated",
        properties: activatedProps,
        createdAt: "2200-01-01T00:01:00.000Z",
      },
      {
        _id: randomId(),
        userId: expiredUser._id,
        name: "rateLimitActivated",
        properties: activatedProps,
        createdAt: "2200-01-01T00:02:00.000Z",
      },
      {
        _id: randomId(),
        userId: expiredUser._id,
        name: "rateLimitDeactivated",
        properties: {
          ...activatedProps,
          triggeredAt: "2200-01-01T00:03:00.000Z",
        },
        createdAt: "2200-01-01T00:03:00.000Z",
      },
    ]);

    const defaultData = await call(moderationRouter.listAutoRateLimits, {
      page: 1,
      showExpiredRateLimits: false,
      showNewUserRateLimits: false,
    });

    const defaultUserIds = new Set(defaultData.rows.map((row) => row.userId));
    expect(defaultUserIds.has(establishedUser._id)).toBe(true);
    expect(defaultUserIds.has(newUser._id)).toBe(false);
    expect(defaultUserIds.has(expiredUser._id)).toBe(false);

    const withNewUsers = await call(moderationRouter.listAutoRateLimits, {
      page: 1,
      showExpiredRateLimits: false,
      showNewUserRateLimits: true,
    });
    const withNewIds = new Set(withNewUsers.rows.map((row) => row.userId));
    expect(withNewIds.has(newUser._id)).toBe(true);

    const expiredOnly = await call(moderationRouter.listAutoRateLimits, {
      page: 1,
      showExpiredRateLimits: true,
      showNewUserRateLimits: true,
    });
    const expiredIds = new Set(expiredOnly.rows.map((row) => row.userId));
    expect(expiredIds.has(expiredUser._id)).toBe(true);
    expect(expiredIds.has(establishedUser._id)).toBe(false);
  });

  test("globally banned users respects showExpiredBans filter", async () => {
    const adminUser = await createTestUser({ isAdmin: true });
    const activeBanned = await createTestUser({
      banned: "2200-01-10T00:00:00.000Z",
      karma: 5,
    });
    const expiredBanned = await createTestUser({
      banned: "2000-01-10T00:00:00.000Z",
      karma: 2,
    });

    mockGetCurrentUser.mockResolvedValue(adminUser);

    const activeOnly = await call(moderationRouter.listGloballyBannedUsers, {
      page: 1,
      showExpiredBans: false,
    });
    const activeOnlyIds = new Set(activeOnly.users.map((u) => u._id));
    expect(activeOnlyIds.has(activeBanned._id)).toBe(true);
    expect(activeOnlyIds.has(expiredBanned._id)).toBe(false);

    const includingExpired = await call(moderationRouter.listGloballyBannedUsers, {
      page: 1,
      showExpiredBans: true,
    });
    const allIds = new Set(includingExpired.users.map((u) => u._id));
    expect(allIds.has(activeBanned._id)).toBe(true);
    expect(allIds.has(expiredBanned._id)).toBe(true);
  });

  test("manual rate limits are restricted to moderators", async () => {
    const nonAdminUser = await createTestUser({ isAdmin: false, groups: [] });
    const targetUser = await createTestUser();
    await db.insert(moderatorActions).values({
      _id: randomId(),
      userId: targetUser._id,
      type: "rateLimitOnePerDay",
      endedAt: "2200-01-01T00:00:00.000Z",
    });

    mockGetCurrentUser.mockResolvedValue(nonAdminUser);
    await expect(
      call(moderationRouter.listManualRateLimits, { page: 1 }),
    ).rejects.toThrow("Forbidden");
  });
});
