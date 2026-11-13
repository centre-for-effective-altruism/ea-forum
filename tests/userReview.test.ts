import { suite, test, expect, beforeEach, vi } from "vitest";
import { createTestComment, createTestPost, createTestUser } from "./testHelpers";
import { triggerReviewIfNeeded } from "@/lib/users/userReview";
import { approveNewUser } from "@/lib/users/userMutations";
import { newPostNotifications } from "@/lib/posts/postCallbacks";
import { Revision, subscriptions, users } from "@/lib/schema";
import { randomId } from "@/lib/utils/random";
import { db } from "@/lib/db";

const pendingWork = vi.hoisted(() => [] as Promise<unknown>[]);

vi.mock(import("@vercel/functions"), async (importOriginal) => ({
  ...(await importOriginal()),
  waitUntil: (promise: Promise<unknown>) => {
    pendingWork.push(promise);
  },
}));

const flushBackgroundWork = async () => {
  while (pendingWork.length) {
    await Promise.all(pendingWork.splice(0));
  }
};

const fetchNeedsReview = async (userId: string): Promise<boolean> => {
  const row = await db.query.users.findFirst({
    where: {
      _id: userId,
    },
  });
  return !!row?.needsReview;
};

suite("triggerReviewIfNeeded (DB integration)", () => {
  beforeEach(async () => {
    await db.delete(users);
  });
  test("does nothing for fully reviewed users", async () => {
    const user = await createTestUser({
      reviewedByUserId: "admin-user",
      snoozedUntilContentCount: null,
      needsReview: false,
    });
    await triggerReviewIfNeeded(user);
    expect(await fetchNeedsReview(user._id)).toBe(false);
  });
  test("triggers review for first post", async () => {
    const user = await createTestUser({
      reviewedByUserId: null,
      postCount: 1,
      needsReview: false,
    });
    await triggerReviewIfNeeded(user);
    expect(await fetchNeedsReview(user._id)).toBe(true);
  });
  test("triggers review for first comment", async () => {
    const user = await createTestUser({
      reviewedByUserId: null,
      commentCount: 1,
      needsReview: false,
    });
    await triggerReviewIfNeeded(user);
    expect(await fetchNeedsReview(user._id)).toBe(true);
  });
  test("triggers review when user has map location", async () => {
    const user = await createTestUser({
      reviewedByUserId: null,
      mapLocation: { lat: 40, lng: -73 },
      needsReview: false,
    });
    await triggerReviewIfNeeded(user);
    expect(await fetchNeedsReview(user._id)).toBe(true);
  });
  test("triggers review when user contacts too many users before review", async () => {
    const user = await createTestUser({
      reviewedByUserId: null,
      usersContactedBeforeReview: ["u1", "u2", "u3"],
      needsReview: false,
    });
    await triggerReviewIfNeeded(user);
    expect(await fetchNeedsReview(user._id)).toBe(true);
  });
  test("triggers review when biography is present", async () => {
    const user = await createTestUser({
      reviewedByUserId: null,
      biography: { html: "<p>Hello</p>" } as Revision,
      needsReview: false,
    });
    await triggerReviewIfNeeded(user);
    expect(await fetchNeedsReview(user._id)).toBe(true);
  });
  test("triggers review when website is present", async () => {
    const user = await createTestUser({
      reviewedByUserId: null,
      website: "https://example.com",
      needsReview: false,
    });
    await triggerReviewIfNeeded(user);
    expect(await fetchNeedsReview(user._id)).toBe(true);
  });
  test("triggers review when profile image is present", async () => {
    const user = await createTestUser({
      reviewedByUserId: null,
      profileImageId: "image-id",
      needsReview: false,
    });
    await triggerReviewIfNeeded(user);
    expect(await fetchNeedsReview(user._id)).toBe(true);
  });
  test("does not trigger review when no initial-review conditions are met", async () => {
    const user = await createTestUser({
      reviewedByUserId: null,
      postCount: 0,
      commentCount: 0,
      usersContactedBeforeReview: [],
      biography: null,
      website: null,
      profileImageId: null,
      mapLocation: null,
      needsReview: false,
    });
    await triggerReviewIfNeeded(user);
    expect(await fetchNeedsReview(user._id)).toBe(false);
  });
  test("triggers review for new content after snooze threshold is reached", async () => {
    const user = await createTestUser({
      reviewedByUserId: "admin-user",
      snoozedUntilContentCount: 3,
      postCount: 2,
      commentCount: 1, // total = 3
      needsReview: false,
    });
    await triggerReviewIfNeeded(user);
    expect(await fetchNeedsReview(user._id)).toBe(true);
  });
  test("does not trigger review if snooze threshold is not yet reached", async () => {
    const user = await createTestUser({
      reviewedByUserId: "admin-user",
      snoozedUntilContentCount: 5,
      postCount: 2,
      commentCount: 1, // total = 3
      needsReview: false,
    });
    await triggerReviewIfNeeded(user);
    expect(await fetchNeedsReview(user._id)).toBe(false);
  });
});

suite("approveNewUser", () => {
  test("approves the user's waiting posts and comments", async () => {
    const [admin, newUser] = await Promise.all([
      createTestUser({ isAdmin: true }),
      createTestUser({ reviewedByUserId: null }),
    ]);
    const [post, comment] = await Promise.all([
      createTestPost({ userId: newUser._id, authorIsUnreviewed: true }),
      createTestComment({ userId: newUser._id, authorIsUnreviewed: true }),
    ]);
    await approveNewUser(admin, newUser._id);
    const [updatedPost, updatedComment] = await Promise.all([
      db.query.posts.findFirst({ where: { _id: post._id } }),
      db.query.comments.findFirst({ where: { _id: comment._id } }),
    ]);
    expect(updatedPost?.authorIsUnreviewed).toBe(false);
    expect(updatedComment?.authorIsUnreviewed).toBe(false);
  });

  test("notifies subscribers about the approved posts and comments", async () => {
    const [admin, newUser, follower, postAuthor] = await Promise.all([
      createTestUser({ isAdmin: true }),
      createTestUser({ reviewedByUserId: null }),
      createTestUser(),
      createTestUser(),
    ]);
    await db.insert(subscriptions).values({
      _id: randomId(),
      userId: follower._id,
      documentId: newUser._id,
      collectionName: "Users",
      type: "newPosts",
      state: "subscribed",
    });
    const otherPost = await createTestPost({ userId: postAuthor._id });
    const [post, comment] = await Promise.all([
      createTestPost({ userId: newUser._id, authorIsUnreviewed: true }),
      createTestComment({
        userId: newUser._id,
        postId: otherPost._id,
        authorIsUnreviewed: true,
      }),
    ]);

    await approveNewUser(admin, newUser._id);
    await flushBackgroundWork();

    const notifications = await db.query.notifications.findMany({
      columns: { userId: true, type: true },
      where: { documentId: { in: [post._id, comment._id] } },
    });
    expect(notifications).toEqual(
      expect.arrayContaining([
        { userId: follower._id, type: "newPost" },
        { userId: postAuthor._id, type: "newComment" },
      ]),
    );
  });

  test("notifies users who asked about events within their radius", async () => {
    const point = (longitude: number, latitude: number) => ({
      type: "Point" as const,
      coordinates: [longitude, latitude] as [number, number],
    });
    const [nearbyUser, distantUser] = await Promise.all([
      createTestUser({
        nearbyEventsNotificationsMongoLocation: point(-0.12, 51.5),
        nearbyEventsNotificationsRadius: 50,
      }),
      createTestUser({
        nearbyEventsNotificationsMongoLocation: point(-74, 40.7),
        nearbyEventsNotificationsRadius: 50,
      }),
    ]);
    const event = await createTestPost({
      isEvent: true,
      mongoLocation: point(-0.1, 51.52),
    });

    await newPostNotifications(event._id);

    const notifiedUserIds = (
      await db.query.notifications.findMany({
        columns: { userId: true },
        where: { documentId: event._id, type: "newEventInRadius" },
      })
    ).map(({ userId }) => userId);
    expect(notifiedUserIds).toContain(nearbyUser._id);
    expect(notifiedUserIds).not.toContain(distantUser._id);
  });
});
