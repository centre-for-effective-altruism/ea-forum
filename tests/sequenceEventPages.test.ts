import { suite, test, expect, beforeEach, vi } from "vitest";
import { call } from "@orpc/server";
import { db } from "@/lib/db";
import { databaseMetadata } from "@/lib/schema";
import { createTestUser } from "./testHelpers";
import {
  newSequenceEventPage,
  sequenceEventConfigFromPage,
  sequenceEventPageSchema,
  type SequenceEventPage,
} from "@/lib/sequences/sequenceEvents";
import {
  fetchSequenceEventPageBySlug,
  fetchSequenceEventPages,
  SEQUENCE_EVENT_PAGES_METADATA_NAME,
  writeSequenceEventPages,
} from "@/lib/sequences/sequenceEventPageQueries";
import {
  deleteSequenceEventPage,
  saveSequenceEventPage,
} from "@/lib/sequences/sequenceEventPageMutations";
import { sequenceEventPagesRouter } from "@/lib/sequences/sequenceEventPagesRouter";
import { currentUserProjection, getCurrentUser } from "@/lib/users/currentUser";

// The router reads the logged in user from the request's cookies, which don't
// exist outside of a request
vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => ({
  ...(await importOriginal()),
  getCurrentUser: vi.fn(),
}));

const loginAs = async (userId: string | null) => {
  if (!userId) {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    return;
  }
  const user = await db.query.users.findFirst({
    ...currentUserProjection,
    where: { _id: userId },
  });
  if (!user) {
    throw new Error("Test user not found");
  }
  vi.mocked(getCurrentUser).mockResolvedValue(user);
};

const makePage = (data?: Partial<SequenceEventPage>): SequenceEventPage => ({
  ...newSequenceEventPage(),
  slug: "test-series",
  sequenceId: "someSequenceId",
  title: "Test series",
  ...data,
});

suite("sequence event pages", () => {
  beforeEach(async () => {
    await db.delete(databaseMetadata);
  });

  test("returns no pages when nothing has been saved", async () => {
    expect(await fetchSequenceEventPages()).toEqual([]);
    expect(await fetchSequenceEventPageBySlug("test-series")).toBeNull();
  });

  test("saves, updates and deletes a page", async () => {
    await saveSequenceEventPage({ page: makePage() });
    expect(await fetchSequenceEventPages()).toHaveLength(1);

    await saveSequenceEventPage({
      page: makePage({ title: "Renamed", published: true }),
      previousSlug: "test-series",
    });
    const page = await fetchSequenceEventPageBySlug("test-series");
    expect(page?.title).toBe("Renamed");
    expect(page?.published).toBe(true);
    expect(await fetchSequenceEventPages()).toHaveLength(1);

    await deleteSequenceEventPage("test-series");
    expect(await fetchSequenceEventPages()).toEqual([]);
  });

  test("can change a page's slug", async () => {
    await saveSequenceEventPage({ page: makePage() });
    await saveSequenceEventPage({
      page: makePage({ slug: "new-slug" }),
      previousSlug: "test-series",
    });
    expect(await fetchSequenceEventPageBySlug("test-series")).toBeNull();
    expect(await fetchSequenceEventPageBySlug("new-slug")).not.toBeNull();
  });

  test("rejects a slug that's already taken", async () => {
    await saveSequenceEventPage({ page: makePage() });
    await expect(
      saveSequenceEventPage({ page: makePage({ title: "Another" }) }),
    ).rejects.toThrow(/already exists/);
    await expect(
      saveSequenceEventPage({
        page: makePage({ slug: "other-series" }),
        previousSlug: "does-not-exist",
      }),
    ).rejects.toThrow(/No page with slug/);
    expect(await fetchSequenceEventPages()).toHaveLength(1);
  });

  test("skips stored pages that are no longer valid", async () => {
    await db.insert(databaseMetadata).values({
      _id: "invalidPagesRow",
      name: SEQUENCE_EVENT_PAGES_METADATA_NAME,
      value: [makePage(), { slug: "broken" }],
    });
    const pages = await fetchSequenceEventPages();
    expect(pages).toHaveLength(1);
    expect(pages[0].slug).toBe("test-series");
  });

  test("doesn't let logged out users save or delete", async () => {
    await writeSequenceEventPages(db, [makePage()]);
    await loginAs(null);
    await expect(
      call(sequenceEventPagesRouter.save, { page: makePage({ title: "Hacked" }) }),
    ).rejects.toThrow(/Permission denied/);
    await expect(
      call(sequenceEventPagesRouter.delete, { slug: "test-series" }),
    ).rejects.toThrow(/Permission denied/);
    expect((await fetchSequenceEventPageBySlug("test-series"))?.title).toBe(
      "Test series",
    );
  });

  test("doesn't let non-admins save or delete", async () => {
    await writeSequenceEventPages(db, [makePage()]);
    const user = await createTestUser();
    await loginAs(user._id);
    await expect(
      call(sequenceEventPagesRouter.save, { page: makePage({ title: "Hacked" }) }),
    ).rejects.toThrow(/Permission denied/);
    await expect(
      call(sequenceEventPagesRouter.delete, { slug: "test-series" }),
    ).rejects.toThrow(/Permission denied/);
    expect((await fetchSequenceEventPageBySlug("test-series"))?.title).toBe(
      "Test series",
    );
  });

  test("lets admins save and delete", async () => {
    const admin = await createTestUser({ isAdmin: true });
    await loginAs(admin._id);
    await call(sequenceEventPagesRouter.save, {
      page: makePage({ published: true }),
    });
    expect((await fetchSequenceEventPageBySlug("test-series"))?.published).toBe(
      true,
    );
    await call(sequenceEventPagesRouter.delete, { slug: "test-series" });
    expect(await fetchSequenceEventPages()).toEqual([]);
  });
});

suite("sequenceEventPageSchema", () => {
  test("accepts valid slugs", () => {
    for (const slug of ["scaling-series", "series2", "a-b-c"]) {
      expect(sequenceEventPageSchema.safeParse(makePage({ slug })).success).toBe(
        true,
      );
    }
  });
  test("rejects slugs that wouldn't be reachable", () => {
    for (const slug of [
      "",
      "Caps",
      "with space",
      "trailing-",
      "double--hyphen",
      "a/b",
    ]) {
      expect(sequenceEventPageSchema.safeParse(makePage({ slug })).success).toBe(
        false,
      );
    }
  });
  test("rejects colours that aren't hex", () => {
    expect(
      sequenceEventPageSchema.safeParse(makePage({ themeColor: "red" })).success,
    ).toBe(false);
  });
  test("allows an empty listen url but not a malformed one", () => {
    expect(
      sequenceEventPageSchema.safeParse(makePage({ listenUrl: "" })).success,
    ).toBe(true);
    expect(
      sequenceEventPageSchema.safeParse(makePage({ listenUrl: "not a url" }))
        .success,
    ).toBe(false);
  });
});

suite("sequenceEventConfigFromPage", () => {
  beforeEach(() => {
    // Needed to build cloudinary urls for the sharing image
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "cea");
  });
  test("derives the page's path, share campaign and sharing image", () => {
    const config = sequenceEventConfigFromPage(
      makePage({ slug: "my-great-series", socialImageId: "some/image" }),
    );
    expect(config.path).toBe("/series/my-great-series");
    expect(config.shareCampaign).toBe("my_great_series");
    expect(config.socialImageUrl).toContain("some/image");
  });
  test("falls back to the site's sharing image", () => {
    const config = sequenceEventConfigFromPage(makePage({ socialImageId: null }));
    expect(config.socialImageUrl).toMatch(/^https:\/\//);
  });
  test("treats an empty listen url as no listen link", () => {
    expect(sequenceEventConfigFromPage(makePage()).listenUrl).toBeUndefined();
  });
});
