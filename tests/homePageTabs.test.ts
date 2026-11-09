import { expect, suite, test, vi } from "vitest";

const loadGetCurrentHomePageTab = async (marginalFundingWeekEnabled: boolean) => {
  vi.resetModules();
  vi.doMock("@/lib/marginalFundingWeek", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/marginalFundingWeek")>()),
    marginalFundingWeekEnabled,
  }));
  const { getCurrentHomePageTab } =
    await import("@/components/HomePage/homePageHelpers");
  return getCurrentHomePageTab;
};

suite("getCurrentHomePageTab", () => {
  test("Uses the event tab while the event is enabled", async () => {
    const getCurrentHomePageTab = await loadGetCurrentHomePageTab(true);
    expect(
      getCurrentHomePageTab({
        last_frontpage_tab: "marginalFunding",
        pre_marginal_funding_frontpage_tab: "magic",
      }),
    ).toBe("marginalFunding");
  });

  test("Restores the pre-event tab once the event is disabled", async () => {
    const getCurrentHomePageTab = await loadGetCurrentHomePageTab(false);
    expect(
      getCurrentHomePageTab({
        last_frontpage_tab: "marginalFunding",
        pre_marginal_funding_frontpage_tab: "magic",
      }),
    ).toBe("magic");
  });

  test("Falls back to the first tab without a saved pre-event tab", async () => {
    const getCurrentHomePageTab = await loadGetCurrentHomePageTab(false);
    expect(getCurrentHomePageTab({ last_frontpage_tab: "marginalFunding" })).toBe(
      "featured",
    );
  });
});
