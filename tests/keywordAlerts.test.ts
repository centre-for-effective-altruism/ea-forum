import { beforeEach, expect, suite, test, vi } from "vitest";
import { call } from "@orpc/server";
import { keywordAlertsRouter } from "@/lib/keywordAlerts/keywordAlertsRouter";
import { fetchKeywordAlerts } from "@/lib/keywordAlerts/keywordAlertQueries";
import {
  MAX_KEYWORD_ALERTS,
  MAX_KEYWORD_LENGTH,
} from "@/lib/keywordAlerts/keywordAlertHelpers";
import { isNewSiteAllowed } from "@/lib/proxy/legacySiteRedirect";
import { createTestUser } from "./testHelpers";

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

vi.mock(import("@/lib/users/currentUser"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
  };
});

const loginAsNewUser = async (keywordAlerts: string[] = []) => {
  const user = await createTestUser({ keywordAlerts });
  mockGetCurrentUser.mockResolvedValue(user);
  return user;
};

suite("Keyword alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("pages are served by the new site", () => {
    expect(isNewSiteAllowed("/keywords")).toBe(true);
    expect(isNewSiteAllowed("/keywords/foo%20bar")).toBe(true);
  });

  test("adding requires login", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(call(keywordAlertsRouter.add, { keyword: "test" })).rejects.toThrow(
      "Please login",
    );
  });

  test("adding normalizes whitespace and prepends the keyword", async () => {
    const user = await loginAsNewUser(["existing"]);
    const result = await call(keywordAlertsRouter.add, {
      keyword: "  animal   welfare ",
    });
    expect(result).toEqual({
      keywordAlerts: ["animal welfare", "existing"],
      added: true,
    });
    expect(await fetchKeywordAlerts(user._id)).toEqual([
      "animal welfare",
      "existing",
    ]);
  });

  test("adding a case-insensitive duplicate doesn't write", async () => {
    const user = await loginAsNewUser(["Animal Welfare", "other"]);
    const result = await call(keywordAlertsRouter.add, {
      keyword: "animal welfare",
    });
    expect(result).toEqual({
      keywordAlerts: ["Animal Welfare", "other"],
      added: false,
    });
    expect(await fetchKeywordAlerts(user._id)).toEqual(["Animal Welfare", "other"]);
  });

  test("adding rejects empty and over-length keywords", async () => {
    const user = await loginAsNewUser();
    await expect(
      call(keywordAlertsRouter.add, { keyword: "   " }),
    ).rejects.toThrow();
    await expect(
      call(keywordAlertsRouter.add, {
        keyword: "a".repeat(MAX_KEYWORD_LENGTH + 1),
      }),
    ).rejects.toThrow();
    expect(await fetchKeywordAlerts(user._id)).toEqual([]);
  });

  test("adding is rejected once the user has the maximum number of alerts", async () => {
    const existing = Array.from(
      { length: MAX_KEYWORD_ALERTS },
      (_, i) => `keyword ${i}`,
    );
    await loginAsNewUser(existing);
    await expect(
      call(keywordAlertsRouter.add, { keyword: "one more" }),
    ).rejects.toThrow(`at most ${MAX_KEYWORD_ALERTS} keyword alerts`);
  });

  test("removing deletes the exact keyword", async () => {
    const user = await loginAsNewUser(["first", "First", "second"]);
    const result = await call(keywordAlertsRouter.remove, { keyword: "first" });
    expect(result).toEqual({ keywordAlerts: ["First", "second"] });
    expect(await fetchKeywordAlerts(user._id)).toEqual(["First", "second"]);
  });
});
