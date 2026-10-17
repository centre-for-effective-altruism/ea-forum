import { suite, test, expect, beforeEach, vi } from "vitest";
import { call } from "@orpc/server";
import { db } from "@/lib/db";
import { databaseMetadata } from "@/lib/schema";
import { createTestUser } from "./testHelpers";
import {
  editorialPageConfig,
  editorialPageSchema,
  newEditorialPage,
  type EditorialPage,
} from "@/lib/sequences/editorialPages";
import {
  EDITORIAL_PAGES_METADATA_NAME,
  fetchEditorialPageBySlug,
  fetchEditorialPages,
  writeEditorialPages,
} from "@/lib/sequences/editorialPageQueries";
import {
  deleteEditorialPage,
  saveEditorialPage,
} from "@/lib/sequences/editorialPageMutations";
import { editorialPagesRouter } from "@/lib/sequences/editorialPagesRouter";
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

const makePage = (data?: Partial<EditorialPage>): EditorialPage => ({
  ...newEditorialPage(),
  slug: "test-series",
  sequenceId: "someSequenceId",
  title: "Test series",
  ...data,
});

suite("editorial pages", () => {
  beforeEach(async () => {
    await db.delete(databaseMetadata);
  });

  test("returns no pages when nothing has been saved", async () => {
    expect(await fetchEditorialPages()).toEqual([]);
    expect(await fetchEditorialPageBySlug("test-series")).toBeNull();
  });

  test("saves, updates and deletes a page", async () => {
    await saveEditorialPage({ page: makePage() });
    expect(await fetchEditorialPages()).toHaveLength(1);

    await saveEditorialPage({
      page: makePage({ title: "Renamed", published: true }),
      previousSlug: "test-series",
    });
    const page = await fetchEditorialPageBySlug("test-series");
    expect(page?.title).toBe("Renamed");
    expect(page?.published).toBe(true);
    expect(await fetchEditorialPages()).toHaveLength(1);

    await deleteEditorialPage("test-series");
    expect(await fetchEditorialPages()).toEqual([]);
  });

  test("can change a page's slug", async () => {
    await saveEditorialPage({ page: makePage() });
    await saveEditorialPage({
      page: makePage({ slug: "new-slug" }),
      previousSlug: "test-series",
    });
    expect(await fetchEditorialPageBySlug("test-series")).toBeNull();
    expect(await fetchEditorialPageBySlug("new-slug")).not.toBeNull();
  });

  test("rejects a slug that's already taken", async () => {
    await saveEditorialPage({ page: makePage() });
    await expect(
      saveEditorialPage({ page: makePage({ title: "Another" }) }),
    ).rejects.toThrow(/already exists/);
    await expect(
      saveEditorialPage({
        page: makePage({ slug: "other-series" }),
        previousSlug: "does-not-exist",
      }),
    ).rejects.toThrow(/No page with slug/);
    expect(await fetchEditorialPages()).toHaveLength(1);
  });

  test("skips stored pages that are no longer valid", async () => {
    await db.insert(databaseMetadata).values({
      _id: "invalidPagesRow",
      name: EDITORIAL_PAGES_METADATA_NAME,
      value: [makePage(), { slug: "broken" }],
    });
    const pages = await fetchEditorialPages();
    expect(pages).toHaveLength(1);
    expect(pages[0].slug).toBe("test-series");
  });

  test("doesn't let logged out users save or delete", async () => {
    await writeEditorialPages(db, [makePage()]);
    await loginAs(null);
    await expect(
      call(editorialPagesRouter.save, { page: makePage({ title: "Hacked" }) }),
    ).rejects.toThrow(/Permission denied/);
    await expect(
      call(editorialPagesRouter.delete, { slug: "test-series" }),
    ).rejects.toThrow(/Permission denied/);
    expect((await fetchEditorialPageBySlug("test-series"))?.title).toBe(
      "Test series",
    );
  });

  test("doesn't let non-admins save or delete", async () => {
    await writeEditorialPages(db, [makePage()]);
    const user = await createTestUser();
    await loginAs(user._id);
    await expect(
      call(editorialPagesRouter.save, { page: makePage({ title: "Hacked" }) }),
    ).rejects.toThrow(/Permission denied/);
    await expect(
      call(editorialPagesRouter.delete, { slug: "test-series" }),
    ).rejects.toThrow(/Permission denied/);
    expect((await fetchEditorialPageBySlug("test-series"))?.title).toBe(
      "Test series",
    );
  });

  test("lets admins save and delete", async () => {
    const admin = await createTestUser({ isAdmin: true });
    await loginAs(admin._id);
    await call(editorialPagesRouter.save, {
      page: makePage({ published: true }),
    });
    expect((await fetchEditorialPageBySlug("test-series"))?.published).toBe(true);
    await call(editorialPagesRouter.delete, { slug: "test-series" });
    expect(await fetchEditorialPages()).toEqual([]);
  });
});

suite("editorialPageSchema", () => {
  test("accepts valid slugs", () => {
    for (const slug of ["toby-ord-on-scaling", "series2", "a-b-c"]) {
      expect(editorialPageSchema.safeParse(makePage({ slug })).success).toBe(true);
    }
  });
  test("rejects slugs that something on the Forum already answers at", () => {
    // A top level slug becomes the page's URL, so it mustn't shadow a page on
    // either site: a route here, a legacy route, or a page built in code
    for (const slug of [
      "about",
      "allposts",
      "editPost",
      "posts",
      "scaling-series",
    ]) {
      expect(editorialPageSchema.safeParse(makePage({ slug })).success).toBe(false);
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
      expect(editorialPageSchema.safeParse(makePage({ slug })).success).toBe(false);
    }
  });
  test("rejects colours that aren't hex", () => {
    expect(
      editorialPageSchema.safeParse(makePage({ themeColor: "red" })).success,
    ).toBe(false);
  });
  test("allows an empty listen url but not a malformed one", () => {
    expect(editorialPageSchema.safeParse(makePage({ listenUrl: "" })).success).toBe(
      true,
    );
    expect(
      editorialPageSchema.safeParse(makePage({ listenUrl: "not a url" })).success,
    ).toBe(false);
  });
});

suite("editorialPageConfig", () => {
  beforeEach(() => {
    // Needed to build cloudinary urls for the sharing image
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "cea");
  });
  test("derives the page's path, share campaign and sharing image", () => {
    const config = editorialPageConfig(
      makePage({ slug: "my-great-series", socialImageId: "some/image" }),
    );
    expect(config.path).toBe("/my-great-series");
    expect(config.shareCampaign).toBe("my_great_series");
    expect(config.socialImageUrl).toContain("some/image");
  });
  test("falls back to the site's sharing image", () => {
    const config = editorialPageConfig(makePage({ socialImageId: null }));
    expect(config.socialImageUrl).toMatch(/^https:\/\//);
  });
  test("carries the listen link through", () => {
    expect(editorialPageConfig(makePage({ listenUrl: "" })).listenUrl).toBe("");
  });
});
