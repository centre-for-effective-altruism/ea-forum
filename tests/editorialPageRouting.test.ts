import { suite, test, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { databaseMetadata } from "@/lib/schema";
import {
  newEditorialPage,
  type EditorialPage,
} from "@/lib/sequences/editorialPages";
import { writeEditorialPages } from "@/lib/sequences/editorialPageQueries";
import { createLegacySiteRedirectResponse } from "@/lib/proxy/legacySiteRedirect";

const LEGACY_HOST = "legacy.example.com";

// The proxy reads this when its module loads, which happens on import
vi.hoisted(() => {
  process.env.LEGACY_SITE_URL = "https://legacy.example.com";
});

const makePage = (data?: Partial<EditorialPage>): EditorialPage => ({
  ...newEditorialPage(),
  slug: "test-series",
  sequenceId: "someSequenceId",
  title: "Test series",
  published: true,
  ...data,
});

const requestFor = (path: string) => {
  const request = new NextRequest(`https://forum.example.com${path}`);
  // The proxy only routes to the new site for users who prefer it, which is the
  // default, but be explicit
  request.cookies.set("prefer_ea_forum_v3", "true");
  return request;
};

/** Where the proxy sent the request: the legacy site, or a path on this one */
const routeFor = async (path: string) => {
  const response = await createLegacySiteRedirectResponse(requestFor(path));
  const rewrite = response.headers.get("x-middleware-rewrite");
  if (!rewrite) {
    return "new-site";
  }
  const url = new URL(rewrite);
  return url.host === LEGACY_HOST ? "legacy" : url.pathname;
};

suite("editorial page routing", () => {
  beforeEach(async () => {
    await db.delete(databaseMetadata);
  });

  test("sends unknown paths to the legacy site", async () => {
    expect(await routeFor("/test-series")).toBe("legacy");
  });

  test("rewrites a published page's top level url to its route", async () => {
    await writeEditorialPages(db, [makePage()]);
    expect(await routeFor("/test-series")).toBe("/series/test-series");
  });

  test("leaves an unpublished page's top level url to the legacy site", async () => {
    await writeEditorialPages(db, [makePage({ published: false })]);
    expect(await routeFor("/test-series")).toBe("legacy");
  });

  test("serves the route itself, so admins can check unpublished pages", async () => {
    await writeEditorialPages(db, [makePage({ published: false })]);
    expect(await routeFor("/series/test-series")).toBe("new-site");
  });

  test("keeps serving paths this site already owns", async () => {
    // A page can't claim these, but make sure a stored page can't take one over
    await writeEditorialPages(db, [makePage({ slug: "best-of" })]);
    expect(await routeFor("/best-of")).toBe("new-site");
  });

  test("serves the admin pages", async () => {
    expect(await routeFor("/admin/editorial-pages")).toBe("new-site");
    expect(await routeFor("/admin/editorial-pages/new")).toBe("new-site");
    expect(await routeFor("/admin/editorial-pages/test-series")).toBe("new-site");
  });

  test("tells the legacy site which top level urls this site owns", async () => {
    await writeEditorialPages(db, [makePage()]);
    const response = await createLegacySiteRedirectResponse(requestFor("/allPosts"));
    const ownedRoutes = response.cookies.get("ea_forum_v3_owned_routes")?.value;
    const patterns: string[] = JSON.parse(ownedRoutes ?? "{}").patterns;
    expect(patterns).toContain("^/test-series$");
  });
});
