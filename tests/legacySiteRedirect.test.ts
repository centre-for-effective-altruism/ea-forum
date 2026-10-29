import { expect, suite, test } from "vitest";
import { isNewSiteAllowed } from "@/lib/proxy/legacySiteRedirect";

suite("Legacy site redirect", () => {
  test("Topic pages are served by the new site", () => {
    expect(isNewSiteAllowed("/topics/global-health")).toBe(true);
    expect(isNewSiteAllowed("/tags/global-health")).toBe(true);
    expect(isNewSiteAllowed("/tag/global-health")).toBe(true);
    expect(isNewSiteAllowed("/topic/global-health")).toBe(true);
  });
  test("Special-case topic slugs are served by the legacy site", () => {
    for (const slug of ["all", "create", "random", "dashboard", "wiki"]) {
      expect(isNewSiteAllowed(`/topics/${slug}`)).toBe(false);
    }
  });
  test("Topic subpages are served by the legacy site", () => {
    expect(isNewSiteAllowed("/topics/global-health/history")).toBe(false);
    expect(isNewSiteAllowed("/topics/global-health/discussion")).toBe(false);
    expect(isNewSiteAllowed("/topics/global-health/subforum")).toBe(false);
  });
  test("Topic pages with legacy-only query params are served by the legacy site", () => {
    for (const param of ["edit", "version", "revision", "flagId"]) {
      expect(
        isNewSiteAllowed(
          "/topics/global-health",
          new URLSearchParams({ [param]: "1" }),
        ),
      ).toBe(false);
    }
    expect(
      isNewSiteAllowed(
        "/topics/global-health",
        new URLSearchParams({ sortedBy: "new" }),
      ),
    ).toBe(true);
  });
  test("The handbook is served by the new site", () => {
    expect(isNewSiteAllowed("/handbook")).toBe(true);
  });
  test("The recommendations page is served by the new site", () => {
    expect(isNewSiteAllowed("/recommendations")).toBe(true);
  });
});
