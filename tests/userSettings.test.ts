import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/users/currentUser";
import { usersRouter } from "@/lib/users/usersRouter";
import { isNewSiteAllowed } from "@/lib/proxy/legacySiteRedirect";
import {
  getUpdatableUserSettings,
  type UserSettings,
} from "@/lib/users/userSettings";
import { fetchUserSettingsPageData } from "@/lib/users/userSettingsQueries";
import { defaultNotificationTypeSettings } from "@/lib/notifications/notificationHelpers";
import type { InsertUser } from "@/lib/schema";
import { createTestComment, createTestPost, createTestUser } from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockMailchimp = vi.hoisted(() => vi.fn());
const mockUpdateAuth0Email = vi.hoisted(() => vi.fn());
const mockModeration = vi.hoisted(() => ({
  banUserIpsAndResetLoginTokens: vi.fn().mockResolvedValue(undefined),
  deleteUserContent: vi.fn().mockResolvedValue(undefined),
  nullifyVotesForUser: vi.fn().mockResolvedValue(undefined),
  reindexUserContent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => ({
  ...(await importOriginal()),
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock(import("@/lib/mailchimp"), async (importOriginal) => ({
  ...(await importOriginal()),
  syncUserMailchimpSubscription: mockMailchimp,
}));

vi.mock(import("@/lib/authHelpers"), async (importOriginal) => ({
  ...(await importOriginal()),
  updateAuth0Email: mockUpdateAuth0Email,
}));

vi.mock(import("@/lib/users/userModeration"), () => mockModeration);

vi.mock(import("@vercel/functions"), async (importOriginal) => ({
  ...(await importOriginal()),
  waitUntil: () => {},
}));

const fetchUser = (userId: string) =>
  db.query.users.findFirst({ where: { _id: userId } });

const loginAs = async (data?: Partial<InsertUser>) => {
  const user = await createTestUser(data);
  mockGetCurrentUser.mockResolvedValue(user);
  return user;
};

const loginAsModerator = () => loginAs({ groups: ["sunshineRegiment"] });

const updateSettings = (userId: string, data: UserSettings) =>
  call(usersRouter.updateSettings, { userId, data });

suite("User settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("pages are served by the new site", () => {
    expect(isNewSiteAllowed("/users/some-user/edit")).toBe(true);
    expect(isNewSiteAllowed("/account")).toBe(true);
  });

  suite("permissions", () => {
    test("users can't edit other users", async () => {
      const other = await createTestUser();
      await loginAs();
      await expect(
        updateSettings(other._id, { hideIntercom: true }),
      ).rejects.toThrow("Permission denied");
      expect(
        await fetchUserSettingsPageData(await getCurrentUser(), other.slug),
      ).toBe(null);
    });

    test("owners can't edit moderator fields", async () => {
      const user = await loginAs();
      await expect(
        updateSettings(user._id, { sunshineNotes: "hi" }),
      ).rejects.toThrow("Permission denied");
    });

    test("moderators can edit general settings but not notifications", async () => {
      const other = await createTestUser();
      await loginAsModerator();
      await updateSettings(other._id, { hideIntercom: true, sunshineNotes: "note" });
      expect(await fetchUser(other._id)).toMatchObject({
        hideIntercom: true,
        sunshineNotes: "note",
      });
      await expect(
        updateSettings(other._id, {
          notificationPrivateMessage: defaultNotificationTypeSettings,
        }),
      ).rejects.toThrow("Permission denied");
      await expect(updateSettings(other._id, { isAdmin: true })).rejects.toThrow(
        "Permission denied",
      );
    });

    test("only trustLevel1 owners can edit their own banned users", async () => {
      const user = await createTestUser();
      const trusted = await createTestUser({ groups: ["trustLevel1"] });
      expect(getUpdatableUserSettings(user, user).has("bannedUserIds")).toBe(false);
      expect(getUpdatableUserSettings(trusted, trusted).has("bannedUserIds")).toBe(
        true,
      );
    });
  });

  test("updating groups keeps groups that can't be edited here", async () => {
    const other = await createTestUser({ groups: ["alignmentForum", "podcasters"] });
    await loginAs({ isAdmin: true });
    const result = await updateSettings(other._id, { groups: ["trustLevel1"] });
    expect(result.groups).toEqual(["trustLevel1"]);
    expect((await fetchUser(other._id))?.groups).toEqual([
      "alignmentForum",
      "trustLevel1",
    ]);
  });

  test("changing the slug keeps the old slug and rejects taken slugs", async () => {
    const taken = await createTestUser({ oldSlugs: ["retired-slug"] });
    const other = await createTestUser();
    await loginAs({ isAdmin: true });

    const result = await updateSettings(other._id, { slug: "New Slug" });
    expect(result.slug).toBe("new-slug");
    expect(await fetchUser(other._id)).toMatchObject({
      slug: "new-slug",
      oldSlugs: [other.slug],
    });
    await expect(updateSettings(other._id, { slug: taken.slug })).rejects.toThrow(
      "already taken",
    );
    await expect(
      updateSettings(other._id, { slug: "retired-slug" }),
    ).rejects.toThrow("already taken");

    await updateSettings(other._id, { slug: "NEW SLUG" });
    expect(await fetchUser(other._id)).toMatchObject({
      slug: "new-slug",
      oldSlugs: [other.slug],
    });
  });

  test("setting the location stores a geo point", async () => {
    const user = await loginAs();
    await updateSettings(user._id, {
      location: {
        label: "London, UK",
        googleLocation: {
          formatted_address: "London, UK",
          geometry: { location: { lat: 51.5, lng: -0.12 } },
        },
      },
    });
    expect(await fetchUser(user._id)).toMatchObject({
      location: "London, UK",
      mongoLocation: { type: "Point", coordinates: [-0.12, 51.5] },
    });
    await updateSettings(user._id, { location: null });
    expect(await fetchUser(user._id)).toMatchObject({
      location: null,
      googleLocation: null,
      mongoLocation: null,
    });
  });

  test("unsubscribing from all emails unsubscribes from the digest", async () => {
    const user = await loginAs({ subscribedToDigest: true, email: "a@example.com" });
    const result = await updateSettings(user._id, { unsubscribeFromAll: true });
    expect(result.subscribedToDigest).toBe(false);
    expect(mockMailchimp).toHaveBeenCalledWith(
      expect.objectContaining({ list: "digest", status: "unsubscribed" }),
    );
  });

  test("a failed digest subscription blocks the update", async () => {
    const user = await loginAs({ email: "a@example.com" });
    mockMailchimp.mockRejectedValueOnce(new Error("Mailchimp down"));
    await expect(
      updateSettings(user._id, { subscribedToDigest: true }),
    ).rejects.toThrow("Mailchimp down");
    expect((await fetchUser(user._id))?.subscribedToDigest).toBe(false);
  });

  test("changing the email updates auth0 and rejects taken emails", async () => {
    await createTestUser({ email: "taken@example.com" });
    const user = await loginAs({ email: "old@example.com" });
    await expect(
      updateSettings(user._id, { email: "TAKEN@example.com" }),
    ).rejects.toThrow("Email already taken");
    await updateSettings(user._id, { email: "new@example.com" });
    expect(mockUpdateAuth0Email).toHaveBeenCalledWith(
      expect.objectContaining({ _id: user._id }),
      "new@example.com",
    );
    expect(await fetchUser(user._id)).toMatchObject({
      email: "new@example.com",
      emails: [{ address: "new@example.com", verified: false }],
    });
  });

  test("changing the karma update frequency resets the batch", async () => {
    const user = await loginAs({
      karmaChangeLastOpened: new Date().toISOString(),
      karmaChangeBatchStart: new Date().toISOString(),
    });
    await updateSettings(user._id, {
      karmaChangeNotifierSettings: {
        updateFrequency: "weekly",
        timeOfDayGMT: 11,
        dayOfWeekGMT: "Saturday",
        showNegativeKarma: false,
      },
    });
    expect(await fetchUser(user._id)).toMatchObject({
      karmaChangeLastOpened: null,
      karmaChangeBatchStart: null,
    });
  });

  test("legacy karma settings with missing keys are filled with defaults", async () => {
    const user = await loginAs({
      karmaChangeNotifierSettings: {
        updateFrequency: "weekly",
      } as InsertUser["karmaChangeNotifierSettings"],
    });
    const data = await fetchUserSettingsPageData(await getCurrentUser(), user.slug);
    const { karmaChangeNotifierSettings } = data!.settings;
    expect(karmaChangeNotifierSettings).toMatchObject({ updateFrequency: "weekly" });
    await updateSettings(user._id, {
      karmaChangeNotifierSettings: {
        ...karmaChangeNotifierSettings!,
        showNegativeKarma: true,
      },
    });
  });

  test("reviewing a user approves their unreviewed content", async () => {
    const other = await createTestUser({ reviewedByUserId: null });
    const post = await createTestPost({
      userId: other._id,
      authorIsUnreviewed: true,
    });
    const commentedPost = await createTestPost({
      commentCount: 5,
      topLevelCommentCount: 3,
    });
    const comment = await createTestComment({
      userId: other._id,
      postId: commentedPost._id,
      authorIsUnreviewed: true,
    });
    await Promise.all([
      createTestComment({
        userId: other._id,
        postId: commentedPost._id,
        parentCommentId: comment._id,
        authorIsUnreviewed: true,
      }),
      createTestComment({
        userId: other._id,
        postId: commentedPost._id,
        authorIsUnreviewed: true,
        deleted: true,
      }),
    ]);
    const moderator = await loginAsModerator();
    await updateSettings(other._id, { reviewedByUserId: moderator._id });
    const [updatedPost, updatedComment, updatedCommentedPost] = await Promise.all([
      db.query.posts.findFirst({ where: { _id: post._id } }),
      db.query.comments.findFirst({ where: { _id: comment._id } }),
      db.query.posts.findFirst({ where: { _id: commentedPost._id } }),
    ]);
    expect(updatedPost?.authorIsUnreviewed).toBe(false);
    expect(updatedComment?.authorIsUnreviewed).toBe(false);
    expect(updatedCommentedPost).toMatchObject({
      commentCount: 7,
      topLevelCommentCount: 4,
    });
  });

  test("the quick takes feed must be the user's own published post", async () => {
    const other = await createTestUser();
    const someoneElsesPost = await createTestPost();
    const ownPost = await createTestPost({ userId: other._id, draft: false });
    await loginAsModerator();
    await expect(
      updateSettings(other._id, { shortformFeedId: someoneElsesPost._id }),
    ).rejects.toThrow("author");
    await updateSettings(other._id, { shortformFeedId: ownPost._id });
    expect(
      (await db.query.posts.findFirst({ where: { _id: ownPost._id } }))?.shortform,
    ).toBe(true);
    await updateSettings(other._id, { shortformFeedId: null });
  });

  test("purge and ban side effects only run when switched on", async () => {
    const other = await createTestUser();
    const moderator = await loginAsModerator();
    const banned = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await updateSettings(other._id, {
      nullifyVotes: true,
      deleteContent: true,
      banned,
    });
    expect(mockModeration.nullifyVotesForUser).toHaveBeenCalledWith(other._id);
    expect(mockModeration.deleteUserContent).toHaveBeenCalledWith(
      moderator,
      other._id,
    );
    expect(mockModeration.banUserIpsAndResetLoginTokens).toHaveBeenCalledWith(
      other._id,
    );
    vi.clearAllMocks();
    await updateSettings(other._id, {
      nullifyVotes: true,
      deleteContent: true,
      banned,
    });
    expect(mockModeration.nullifyVotesForUser).not.toHaveBeenCalled();
    expect(mockModeration.deleteUserContent).not.toHaveBeenCalled();
    expect(mockModeration.banUserIpsAndResetLoginTokens).not.toHaveBeenCalled();
  });

  suite("account deactivation", () => {
    test("requesting deletion deactivates the account", async () => {
      const user = await loginAs({
        subscribedToDigest: true,
        email: "a@example.com",
      });
      await call(usersRouter.setDeletionRequested, {
        userId: user._id,
        requested: true,
      });
      const updated = await fetchUser(user._id);
      expect(updated).toMatchObject({ deleted: true, subscribedToDigest: false });
      expect(updated?.permanentDeletionRequestedAt).not.toBeNull();
      expect(mockModeration.reindexUserContent).toHaveBeenCalledWith(user._id);
    });

    test("can't reactivate while deletion is requested", async () => {
      const user = await loginAs();
      await call(usersRouter.setDeletionRequested, {
        userId: user._id,
        requested: true,
      });
      await expect(
        call(usersRouter.setDeactivated, { userId: user._id, deactivated: false }),
      ).rejects.toThrow("Revoke the deletion request");
      await call(usersRouter.setDeletionRequested, {
        userId: user._id,
        requested: false,
      });
      await call(usersRouter.setDeactivated, {
        userId: user._id,
        deactivated: false,
      });
      expect((await fetchUser(user._id))?.deleted).toBe(false);
    });
  });
});
