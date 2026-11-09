import { suite, test, expect } from "vitest";
import {
  getCurrentGivingSeasonWeek,
  isGivingSeasonOver,
} from "@/lib/givingSeason/givingSeason2026";

const currentWeekId = (iso: string) =>
  getCurrentGivingSeasonWeek(new Date(iso))?.id ?? null;

suite("getCurrentGivingSeasonWeek", () => {
  test("treats the first week as current before the season starts", () => {
    expect(currentWeekId("2026-11-09T12:00:00Z")).toBe("marginalFunding");
  });
  test("changes week at midnight UTC", () => {
    expect(currentWeekId("2026-11-22T23:59:59Z")).toBe("marginalFunding");
    expect(currentWeekId("2026-11-23T00:00:00Z")).toBe("fundingStrategy");
  });
  test("returns null during gap weeks", () => {
    expect(currentWeekId("2026-12-07T00:00:00Z")).toBeNull();
    expect(currentWeekId("2026-12-13T23:59:59Z")).toBeNull();
    expect(currentWeekId("2026-12-14T00:00:00Z")).toBe("whyIDonate");
    expect(currentWeekId("2026-12-24T12:00:00Z")).toBeNull();
  });
  test("runs the last week until the end of the year", () => {
    expect(currentWeekId("2026-12-31T23:59:59Z")).toBe("donationCelebration");
  });
});

suite("isGivingSeasonOver", () => {
  test("ends at the start of 2027 UTC", () => {
    expect(isGivingSeasonOver(new Date("2026-12-31T23:59:59Z"))).toBe(false);
    expect(isGivingSeasonOver(new Date("2027-01-01T00:00:00Z"))).toBe(true);
  });
});
