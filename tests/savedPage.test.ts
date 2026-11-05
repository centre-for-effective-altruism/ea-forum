import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { db } from "@/lib/db";
import { bookmarksRouter } from "@/lib/bookmarks/bookmarksRouter";
import { readStatusesRouter } from "@/lib/readStatuses/readStatusesRouter";
import { votesRouter } from "@/lib/votes/voteRouter";
import { sequencesRouter } from "@/lib/sequences/sequencesRouter";
import { isNewSiteAllowed } from "@/lib/proxy/legacySiteRedirect";
import { groupByRecency } from "@/components/SavedPage/groupByRecency";
import {
  createTestBook,
  createTestBookmark,
  createTestChapter,
  createTestCollection,
  createTestComment,
  createTestPost,
  createTestReadStatus,
  createTestSequence,
  createTestUser,
  createTestVote,
} from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

const loginAsNewUser = async () => {
  const user = await createTestUser();
  mockGetCurrentUser.mockResolvedValue(user);
  return user;
};

const ids = (items: { _id: string }[]) => items.map(({ _id }) => _id);

const fetchPartiallyReadSequences = async (userId: string) => {
  const user = await db.query.users.findFirst({
    columns: { partiallyReadSequences: true },
    where: { _id: userId },
  });
  return user?.partiallyReadSequences ?? [];
};

suite("Saved page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("is served by the new site", () => {
    expect(isNewSiteAllowed("/saved")).toBe(true);
  });

  suite("bookmarks", () => {
    test("lists the user's active post bookmarks, most recently saved first", async () => {
      const user = await loginAsNewUser();
      const otherUser = await createTestUser();
      const [older, newer, inactive, otherUsers] = await Promise.all([
        createTestPost(),
        createTestPost(),
        createTestPost(),
        createTestPost(),
      ]);
      await createTestBookmark({
        userId: user._id,
        documentId: older._id,
        lastUpdated: "2024-01-01T00:00:00.000Z",
      });
      await createTestBookmark({
        userId: user._id,
        documentId: newer._id,
        lastUpdated: "2024-02-01T00:00:00.000Z",
      });
      await createTestBookmark({
        userId: user._id,
        documentId: inactive._id,
        active: false,
      });
      await createTestBookmark({
        userId: otherUser._id,
        documentId: otherUsers._id,
      });

      const { items } = await call(bookmarksRouter.listPosts, {});
      expect(ids(items)).toEqual([newer._id, older._id]);

      const secondPage = await call(bookmarksRouter.listPosts, { offset: 1 });
      expect(ids(secondPage.items)).toEqual([older._id]);
    });

    test("lists saved comments separately from saved posts", async () => {
      const user = await loginAsNewUser();
      const post = await createTestPost();
      const comment = await createTestComment({ postId: post._id });
      const deletedComment = await createTestComment({
        postId: post._id,
        deleted: true,
      });
      for (const { _id } of [comment, deletedComment]) {
        await createTestBookmark({
          userId: user._id,
          documentId: _id,
          collectionName: "Comments",
        });
      }

      const comments = await call(bookmarksRouter.listComments, {});
      expect(ids(comments.items)).toEqual([comment._id]);
      const posts = await call(bookmarksRouter.listPosts, {});
      expect(posts.items).toEqual([]);
    });
  });

  test("read history lists the user's read posts, most recently read first", async () => {
    const user = await loginAsNewUser();
    const otherUser = await createTestUser();
    const [older, newer, unread] = await Promise.all([
      createTestPost(),
      createTestPost(),
      createTestPost(),
    ]);
    await createTestReadStatus({
      userId: user._id,
      postId: newer._id,
      lastUpdated: "2024-02-01T00:00:00.000Z",
    });
    await createTestReadStatus({
      userId: user._id,
      postId: older._id,
      lastUpdated: "2024-01-01T00:00:00.000Z",
    });
    await createTestReadStatus({ userId: otherUser._id, postId: unread._id });

    const { items } = await call(readStatusesRouter.listHistory, {});
    expect(ids(items)).toEqual([newer._id, older._id]);
  });

  test("vote history skips cancelled, self, and plain neutral votes", async () => {
    const user = await loginAsNewUser();
    const author = await createTestUser();
    const [post, ownPost, cancelledPost, neutralPost, deletedPost] =
      await Promise.all([
        createTestPost({ userId: author._id }),
        createTestPost({ userId: user._id }),
        createTestPost({ userId: author._id }),
        createTestPost({ userId: author._id }),
        createTestPost({ userId: author._id, draft: true }),
      ]);
    const comment = await createTestComment({
      postId: post._id,
      userId: author._id,
    });
    const vote = (documentId: string, data: Parameters<typeof createTestVote>[0]) =>
      createTestVote({
        userId: user._id,
        documentId,
        authorIds: [author._id],
        ...data,
      });
    await vote(post._id, { votedAt: "2024-01-01T00:00:00.000Z" });
    await vote(comment._id, {
      collectionName: "Comments",
      votedAt: "2024-01-03T00:00:00.000Z",
    });
    await vote(deletedPost._id, { votedAt: "2024-01-02T00:00:00.000Z" });
    await vote(ownPost._id, { authorIds: [user._id] });
    await vote(cancelledPost._id, { cancelled: true });
    await vote(neutralPost._id, { voteType: "neutral" });

    const { items } = await call(votesRouter.listHistory, {});
    expect(
      items.map(({ post, comment }) => post?._id ?? comment?._id ?? null),
    ).toEqual([comment._id, null, post._id]);
  });

  suite("continue reading", () => {
    test("records the first unread post in the sequence", async () => {
      const user = await loginAsNewUser();
      const [first, second, third] = await Promise.all([
        createTestPost(),
        createTestPost(),
        createTestPost(),
      ]);
      const sequence = await createTestSequence();
      await createTestChapter({
        sequenceId: sequence._id,
        number: 1,
        postIds: [first._id, second._id, third._id],
      });
      await createTestReadStatus({ userId: user._id, postId: first._id });

      await call(sequencesRouter.updateContinueReading, {
        sequenceId: sequence._id,
        postId: second._id,
      });

      expect(await fetchPartiallyReadSequences(user._id)).toEqual([
        expect.objectContaining({
          sequenceId: sequence._id,
          lastReadPostId: second._id,
          nextPostId: second._id,
          numRead: 1,
          numTotal: 3,
        }),
      ]);
    });

    test("moves on to the canonical collection when the sequence is finished", async () => {
      const user = await loginAsNewUser();
      const collection = await createTestCollection();
      const [finished, next] = await Promise.all([
        createTestSequence({ canonicalCollectionSlug: collection.slug }),
        createTestSequence({ canonicalCollectionSlug: collection.slug }),
      ]);
      await createTestBook({
        collectionId: collection._id,
        sequenceIds: [finished._id, next._id],
      });
      const [readPost, unreadPost] = await Promise.all([
        createTestPost(),
        createTestPost(),
      ]);
      await createTestChapter({ sequenceId: finished._id, postIds: [readPost._id] });
      await createTestChapter({ sequenceId: next._id, postIds: [unreadPost._id] });
      await createTestReadStatus({ userId: user._id, postId: readPost._id });

      await call(sequencesRouter.updateContinueReading, {
        sequenceId: finished._id,
        postId: readPost._id,
      });

      expect(await fetchPartiallyReadSequences(user._id)).toEqual([
        expect.objectContaining({
          collectionId: collection._id,
          nextPostId: unreadPost._id,
          numRead: 1,
          numTotal: 2,
        }),
      ]);
    });

    test("removes the sequence once everything has been read", async () => {
      const user = await loginAsNewUser();
      const post = await createTestPost();
      const sequence = await createTestSequence();
      await createTestChapter({ sequenceId: sequence._id, postIds: [post._id] });

      await call(sequencesRouter.updateContinueReading, {
        sequenceId: sequence._id,
        postId: post._id,
      });
      expect(await fetchPartiallyReadSequences(user._id)).toHaveLength(1);

      await createTestReadStatus({ userId: user._id, postId: post._id });
      await call(sequencesRouter.updateContinueReading, {
        sequenceId: sequence._id,
        postId: post._id,
      });
      expect(await fetchPartiallyReadSequences(user._id)).toEqual([]);
    });

    test("dismissing removes the entry for that post", async () => {
      const user = await loginAsNewUser();
      const post = await createTestPost();
      const sequence = await createTestSequence();
      await createTestChapter({ sequenceId: sequence._id, postIds: [post._id] });
      await call(sequencesRouter.updateContinueReading, {
        sequenceId: sequence._id,
        postId: post._id,
      });

      await call(sequencesRouter.dismissContinueReading, { postId: post._id });

      expect(await fetchPartiallyReadSequences(user._id)).toEqual([]);
    });
  });

  test("groupByRecency groups by calendar day in the given timezone", () => {
    const now = new Date("2024-06-10T02:00:00.000Z");
    const items = [
      "2024-06-10T01:00:00.000Z",
      "2024-06-09T23:00:00.000Z",
      "2024-06-09T03:00:00.000Z",
      "2024-06-08T12:00:00.000Z",
    ];
    const titles = (timezone: string) =>
      groupByRecency(items, (date) => date, timezone, now).map(
        ({ title, items }) => [title, items.length],
      );
    expect(titles("UTC")).toEqual([
      ["Today", 1],
      ["Yesterday", 2],
      ["Older", 1],
    ]);
    // In New York it's still the evening of the 9th
    expect(titles("America/New_York")).toEqual([
      ["Today", 2],
      ["Yesterday", 2],
    ]);
  });
});
