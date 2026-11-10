import { suite, test, expect } from "vitest";
import {
  getCurrentGivingSeasonWeek,
  isGivingSeasonOver,
} from "@/lib/givingSeason/givingSeason2026";

const currentWeekId = (iso: string) =>
  getCurrentGivingSeasonWeek(new Date(iso))?.id ?? null;

suite("getCurrentGivingSeasonWeek", () => {
  test("returns null before the season starts", () => {
    expect(currentWeekId("2026-11-09T12:00:00Z")).toBeNull();
    expect(currentWeekId("2026-11-15T23:59:59Z")).toBeNull();
    expect(currentWeekId("2026-11-16T00:00:00Z")).toBe("marginalFunding");
  });
  test("changes week at midnight UTC", () => {
    expect(currentWeekId("2026-11-22T23:59:59Z")).toBe("marginalFunding");
    expect(currentWeekId("2026-11-23T00:00:00Z")).toBe("fundingStrategy");
    expect(currentWeekId("2026-11-30T00:00:00Z")).toBe("eaAndAiDebate");
    expect(currentWeekId("2026-12-06T23:59:59Z")).toBe("eaAndAiDebate");
  });
  test("returns null during gap weeks", () => {
    expect(currentWeekId("2026-12-07T00:00:00Z")).toBeNull();
    expect(currentWeekId("2026-12-13T23:59:59Z")).toBeNull();
    expect(currentWeekId("2026-12-14T00:00:00Z")).toBe("whyIDonate");
    expect(currentWeekId("2026-12-20T23:59:59Z")).toBe("whyIDonate");
    expect(currentWeekId("2026-12-21T00:00:00Z")).toBeNull();
    expect(currentWeekId("2026-12-27T23:59:59Z")).toBeNull();
  });
  test("runs the last week until the end of the year", () => {
    expect(currentWeekId("2026-12-28T00:00:00Z")).toBe("donationCelebration");
    expect(currentWeekId("2026-12-31T23:59:59Z")).toBe("donationCelebration");
  });
});

suite("isGivingSeasonOver", () => {
  test("ends at the start of 2027 UTC", () => {
    expect(isGivingSeasonOver(new Date("2026-12-31T23:59:59Z"))).toBe(false);
    expect(isGivingSeasonOver(new Date("2027-01-01T00:00:00Z"))).toBe(true);
  });
});
