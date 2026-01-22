import { afterEach, expect, suite, test, vi } from "vitest";
import {
  addTime,
  formatLongDate,
  formatLongDateWithTime,
  formatRelativeTime,
  formatShortDate,
  intervalToHours,
  isTimeInterval,
  nDaysAgo,
  nHoursAgo,
  nMonthsAgo,
  nYearsFromNow,
  secondsAgo,
  subtractTime,
} from "@/lib/timeUtils";

suite("Time utils", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  suite("formatRelativeTime", () => {
    test("returns 'just now' for a date equal to now (long)", () => {
      vi.useFakeTimers();
      const now = new Date("2024-01-10T12:00:00Z");
      vi.setSystemTime(now);
      expect(formatRelativeTime(now, { style: "long" })).toBe("just now");
    });
    test("returns 'now' for a date equal to now (short)", () => {
      vi.useFakeTimers();
      const now = new Date("2024-01-10T12:00:00Z");
      vi.setSystemTime(now);
      expect(formatRelativeTime(now, { style: "short" })).toBe("now");
    });
    test("formats seconds ago correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:00:10Z"));
      const past = new Date("2024-01-10T12:00:00Z");
      expect(formatRelativeTime(past, { style: "long" })).toBe("10 seconds ago");
      expect(formatRelativeTime(past, { style: "short" })).toBe("10s");
    });
    test("formats minutes ago correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:05:00Z"));
      const past = new Date("2024-01-10T12:00:00Z");
      expect(formatRelativeTime(past, { style: "long" })).toBe("5 minutes ago");
      expect(formatRelativeTime(past, { style: "short" })).toBe("5m");
    });
    test("formats hours ago correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T15:00:00Z"));
      const past = new Date("2024-01-10T12:00:00Z");
      expect(formatRelativeTime(past, { style: "long" })).toBe("3 hours ago");
      expect(formatRelativeTime(past, { style: "short" })).toBe("3h");
    });
    test("formats days ago correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-12T12:00:00Z"));
      const past = new Date("2024-01-10T12:00:00Z");
      expect(formatRelativeTime(past, { style: "long" })).toBe("2 days ago");
      expect(formatRelativeTime(past, { style: "short" })).toBe("2d");
    });
    test("formats weeks ago correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-24T12:00:00Z"));
      const past = new Date("2024-01-10T12:00:00Z");
      expect(formatRelativeTime(past, { style: "long" })).toBe("2 weeks ago");
      expect(formatRelativeTime(past, { style: "short" })).toBe("2w");
    });
    test("formats months ago correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-10T12:00:00Z"));
      const past = new Date("2024-01-10T12:00:00Z");
      expect(formatRelativeTime(past, { style: "long" })).toBe("5 months ago");
      expect(formatRelativeTime(past, { style: "short" })).toBe("5mo");
    });
    test("formats years ago correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-10T12:00:00Z"));
      const past = new Date("2024-01-10T12:00:00Z");
      expect(formatRelativeTime(past, { style: "long" })).toBe("2 years ago");
      expect(formatRelativeTime(past, { style: "short" })).toBe("2y");
    });
  });
  suite("formatShortDate", () => {
    test("omits year if date is in current year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-05-15T12:00:00Z"));
      const date = new Date("2024-03-10T00:00:00Z");
      const result = formatShortDate(date, "UTC");
      expect(result).toBe("Mar 10");
    });
    test("includes year if date is not in current year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-05-15T12:00:00Z"));
      const date = new Date("2023-11-05T00:00:00Z");
      const result = formatShortDate(date, "UTC");
      expect(result).toBe("Nov 5, 2023");
    });
    test("works with ISO string input", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-05-15T12:00:00Z"));
      const isoString = "2022-07-20T00:00:00Z";
      const result = formatShortDate(isoString, "UTC");
      expect(result).toBe("Jul 20, 2022");
    });
  });
  suite("formatLongDate", () => {
    test("omits year if date is in current year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-05-15T12:00:00Z"));
      const date = new Date("2024-03-10T00:00:00Z");
      const result = formatLongDate(date, "UTC");
      expect(result).toBe("Mar 10");
    });
    test("includes year if date is not in current year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-05-15T12:00:00Z"));
      const date = new Date("2023-11-05T00:00:00Z");
      const result = formatLongDate(date, "UTC");
      expect(result).toBe("Nov 5, 2023");
    });
    test("works with ISO string input", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-05-15T12:00:00Z"));
      const isoString = "2022-07-20T00:00:00Z";
      const result = formatLongDate(isoString, "UTC");
      expect(result).toBe("Jul 20, 2022");
    });
  });
  suite("formatLongDateWithTime", () => {
    test("omits year if date is in current year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-05-15T12:00:00Z"));
      const date = new Date("2024-03-10T09:30:00Z");
      const result = formatLongDateWithTime(date, "UTC");
      expect(result).toBe("Mar 10, 09:30 AM");
    });
    test("includes year if date is not in current year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-05-15T12:00:00Z"));
      const date = new Date("2023-11-05T18:45:00Z");
      const result = formatLongDateWithTime(date, "UTC");
      expect(result).toBe("Nov 5, 2023, 06:45 PM");
    });
    test("works with ISO string input", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-05-15T12:00:00Z"));
      const isoString = "2022-07-20T22:15:00Z";
      const result = formatLongDateWithTime(isoString, "UTC");
      expect(result).toBe("Jul 20, 2022, 10:15 PM");
    });
  });
  suite("nDaysAgo", () => {
    test("returns a date n days in the past", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
      const result = nDaysAgo(3);
      expect(result.toISOString()).toBe("2024-01-07T12:00:00.000Z");
    });
    test("returns the current date when n is 0", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
      const result = nDaysAgo(0);
      expect(result.toISOString()).toBe("2024-01-10T12:00:00.000Z");
    });

    test("handles large values of n", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
      const result = nDaysAgo(365);
      expect(result.toISOString()).toBe("2023-01-10T12:00:00.000Z");
    });
  });
  suite("nMonthsAgo", () => {
    test("returns a date n months in the past", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
      const result = nMonthsAgo(2);
      expect(result.toISOString()).toBe("2024-04-15T12:00:00.000Z");
    });
    test("handles year rollover correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T08:00:00Z"));
      const result = nMonthsAgo(3);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(9); // October (0-based)
      expect(result.getDate()).toBe(10);
    });
    test("follows JavaScript Date rollover behavior for end-of-month", () => {
      // March 31 - 1 month -> March 2/3 (not Feb 28)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-03-31T12:00:00Z"));
      const result = nMonthsAgo(1);
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(2); // March (0-based)
      expect(result.getUTCDate()).toBe(2);
    });
  });
  suite("nHoursAgo", () => {
    test("returns a date n hours in the past", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
      const result = nHoursAgo(5);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(10);
      expect(result.getHours()).toBe(7); // 12 - 5 = 7
    });
    test("returns the current date when n is 0", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
      const result = nHoursAgo(0);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(10);
      expect(result.getHours()).toBe(12);
    });
    test("handles large values of n crossing days", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T02:00:00Z"));
      const result = nHoursAgo(5);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(9); // Previous day
      expect(result.getHours()).toBe(21); // 2 - 5 = 21 (previous day)
    });
  });
  suite("nYearsFromNow", () => {
    test("returns a date n years in the future", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
      const result = nYearsFromNow(3);
      expect(result.getFullYear()).toBe(2027);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(10);
    });
    test("returns the current date when n is 0", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
      const result = nYearsFromNow(0);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(10);
    });
    test("handles negative n (past years)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
      const result = nYearsFromNow(-5);
      expect(result.getFullYear()).toBe(2019);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(10);
    });
  });
  suite("secondsAgo", () => {
    test("returns 0 seconds for now", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
      const result = secondsAgo(new Date("2024-01-10T12:00:00Z"));
      expect(result).toBe(0);
    });
    test("returns correct seconds in the past", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:00:10Z")); // 10 seconds later
      const pastDate = new Date("2024-01-10T12:00:00Z");
      const result = secondsAgo(pastDate);
      expect(result).toBe(10);
    });
    test("returns correct seconds for multiple minutes", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-10T12:05:30Z"));
      const pastDate = new Date("2024-01-10T12:00:00Z");
      const result = secondsAgo(pastDate);
      expect(result).toBe(330); // 5 minutes 30 seconds
    });
    test("handles past dates in previous day", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-11T01:00:00Z"));
      const pastDate = new Date("2024-01-10T23:30:00Z");
      const result = secondsAgo(pastDate);
      expect(result).toBe(5400); // 1.5 hours = 5400 seconds
    });
  });
  test("isInterval", () => {
    expect(isTimeInterval("hours")).toBe(true);
    expect(isTimeInterval("hello world")).toBe(false);
  });
  suite("intervalToHours", () => {
    test("converts milliseconds to hours correctly", () => {
      expect(intervalToHours(3_600_000, "milliseconds")).toBeCloseTo(1);
      expect(intervalToHours(7_200_000, "milliseconds")).toBeCloseTo(2);
    });
    test("converts seconds to hours correctly", () => {
      expect(intervalToHours(3_600, "seconds")).toBeCloseTo(1);
      expect(intervalToHours(7_200, "seconds")).toBeCloseTo(2);
    });
    test("converts minutes to hours correctly", () => {
      expect(intervalToHours(60, "minutes")).toBe(1);
      expect(intervalToHours(120, "minutes")).toBe(2);
    });
    test("converts hours correctly", () => {
      expect(intervalToHours(1, "hours")).toBe(1);
      expect(intervalToHours(5, "hours")).toBe(5);
    });
    test("converts days correctly", () => {
      expect(intervalToHours(1, "days")).toBe(24);
    });
    test("converts weeks correctly", () => {
      expect(intervalToHours(1, "weeks")).toBe(168); // 7*24
    });
    test("converts months correctly", () => {
      expect(intervalToHours(1, "months")).toBeCloseTo(730.56); // 30.44*24
    });
    test("converts years correctly", () => {
      expect(intervalToHours(1, "years")).toBeCloseTo(8765.76); // 365.24*24
    });
    test("throws on unsupported interval", () => {
      // @ts-expect-error testing invalid input
      expect(() => intervalToHours(1, "decade")).toThrow(
        "Unsupported interval: decade",
      );
    });
  });
  suite("addTime", () => {
    suite("milliseconds", () => {
      test("should add milliseconds correctly", () => {
        const date = new Date("2024-01-15T10:30:00.000Z");
        const result = addTime(date, 500, "milliseconds");
        expect(result.getTime()).toBe(date.getTime() + 500);
      });
      test("should handle large millisecond values", () => {
        const date = new Date("2024-01-15T10:30:00.000Z");
        const result = addTime(date, 86400000, "milliseconds"); // 1 day
        expect(result.toISOString()).toBe(
          new Date("2024-01-16T10:30:00.000Z").toISOString(),
        );
      });
      test("should handle negative milliseconds", () => {
        const date = new Date("2024-01-15T10:30:00.500Z");
        const result = addTime(date, -500, "milliseconds");
        expect(result.toISOString()).toBe(
          new Date("2024-01-15T10:30:00.000Z").toISOString(),
        );
      });
    });
    suite("seconds", () => {
      test("should add seconds correctly", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, 30, "seconds");
        expect(result.toISOString()).toBe(
          new Date("2024-01-15T10:30:30Z").toISOString(),
        );
      });
      test("should roll over to next minute when adding 60+ seconds", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, 90, "seconds");
        expect(result.toISOString()).toBe(
          new Date("2024-01-15T10:31:30Z").toISOString(),
        );
      });
      test("should handle negative seconds", () => {
        const date = new Date("2024-01-15T10:30:30Z");
        const result = addTime(date, -30, "seconds");
        expect(result.toISOString()).toBe(
          new Date("2024-01-15T10:30:00Z").toISOString(),
        );
      });
    });
    suite("minutes", () => {
      test("should add minutes correctly", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, 15, "minutes");
        expect(result.toISOString()).toBe(
          new Date("2024-01-15T10:45:00Z").toISOString(),
        );
      });
      test("should roll over to next hour when adding 60+ minutes", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, 90, "minutes");
        expect(result.toISOString()).toBe(
          new Date("2024-01-15T12:00:00Z").toISOString(),
        );
      });
      test("should handle negative minutes", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, -45, "minutes");
        expect(result.toISOString()).toBe(
          new Date("2024-01-15T09:45:00Z").toISOString(),
        );
      });
    });
    suite("hours", () => {
      test("should add hours correctly", () => {
        const date = new Date("2024-01-15T10:00:00Z");
        const result = addTime(date, 5, "hours");
        expect(result.toISOString()).toBe(
          new Date("2024-01-15T15:00:00Z").toISOString(),
        );
      });
      test("should roll over to next day when adding 24+ hours", () => {
        const date = new Date("2024-01-15T10:00:00Z");
        const result = addTime(date, 30, "hours");
        expect(result.toISOString()).toBe(
          new Date("2024-01-16T16:00:00Z").toISOString(),
        );
      });
      test("should handle negative hours", () => {
        const date = new Date("2024-01-15T10:00:00Z");
        const result = addTime(date, -5, "hours");
        expect(result.toISOString()).toBe(
          new Date("2024-01-15T05:00:00Z").toISOString(),
        );
      });
    });
    suite("days", () => {
      test("should add days correctly", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, 5, "days");
        expect(result.toISOString()).toBe(
          new Date("2024-01-20T10:30:00Z").toISOString(),
        );
      });
      test("should roll over to next month", () => {
        const date = new Date("2024-01-25T10:30:00Z");
        const result = addTime(date, 10, "days");
        expect(result.toISOString()).toBe(
          new Date("2024-02-04T10:30:00Z").toISOString(),
        );
      });
      test("should handle negative days", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, -10, "days");
        expect(result.toISOString()).toBe(
          new Date("2024-01-05T10:30:00Z").toISOString(),
        );
      });
      test("should handle leap year February", () => {
        const date = new Date("2024-02-28T10:30:00Z");
        const result = addTime(date, 1, "days");
        expect(result.toISOString()).toBe(
          new Date("2024-02-29T10:30:00Z").toISOString(),
        );
      });
    });
    suite("weeks", () => {
      test("should add weeks correctly", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, 2, "weeks");
        expect(result.toISOString()).toBe(
          new Date("2024-01-29T10:30:00Z").toISOString(),
        );
      });
      test("should roll over to next month", () => {
        const date = new Date("2024-01-25T10:30:00Z");
        const result = addTime(date, 2, "weeks");
        expect(result.toISOString()).toBe(
          new Date("2024-02-08T10:30:00Z").toISOString(),
        );
      });
      test("should handle negative weeks", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, -1, "weeks");
        expect(result.toISOString()).toBe(
          new Date("2024-01-08T10:30:00Z").toISOString(),
        );
      });
      test("should calculate weeks as 7 days", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const resultWeeks = addTime(date, 1, "weeks");
        const resultDays = addTime(date, 7, "days");
        expect(resultWeeks.toISOString()).toBe(resultDays.toISOString());
      });
    });
    suite("months", () => {
      test("should add one month correctly", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, 1, "months");
        expect(result.toISOString()).toBe(
          new Date("2024-02-15T10:30:00Z").toISOString(),
        );
      });
      test("should add multiple months correctly", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, 3, "months");
        expect(result.getUTCFullYear()).toBe(2024);
        expect(result.getUTCMonth()).toBe(3); // April (0-indexed)
        expect(result.getUTCDate()).toBe(15);
      });
      test("should roll over to next year", () => {
        const date = new Date("2024-11-15T10:30:00Z");
        const result = addTime(date, 3, "months");
        expect(result.toISOString()).toBe(
          new Date("2025-02-15T10:30:00Z").toISOString(),
        );
      });
      test("should handle negative months", () => {
        const date = new Date("2024-05-15T10:30:00Z");
        const result = addTime(date, -2, "months");
        expect(result.getUTCMonth()).toBe(2); // March
        expect(result.getUTCDate()).toBe(15);
        expect([10, 11]).toContain(result.getUTCHours()); // Accept either due to DST
      });
      test("should handle month-end overflow (31st to 30-day month)", () => {
        const date = new Date("2024-03-31T10:30:00Z");
        const result = addTime(date, 1, "months");
        // March 31 + 1 month = May 1 (April only has 30 days)
        expect(result.toISOString()).toBe(
          new Date("2024-05-01T10:30:00Z").toISOString(),
        );
      });
      test("should handle month-end overflow to February (leap year)", () => {
        const date = new Date("2024-01-31T10:30:00Z");
        const result = addTime(date, 1, "months");
        // Jan 31 + 1 month in leap year = March 2 (Feb has 29 days)
        expect(result.toISOString()).toBe(
          new Date("2024-03-02T10:30:00Z").toISOString(),
        );
      });
      test("should handle month-end overflow to February (non-leap year)", () => {
        const date = new Date("2023-01-31T10:30:00Z");
        const result = addTime(date, 1, "months");
        // Jan 31 + 1 month in non-leap year = March 3 (Feb has 28 days)
        expect(result.toISOString()).toBe(
          new Date("2023-03-03T10:30:00Z").toISOString(),
        );
      });
      test("should add 12 months (one year)", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, 12, "months");
        expect(result.toISOString()).toBe(
          new Date("2025-01-15T10:30:00Z").toISOString(),
        );
      });
    });
    suite("years", () => {
      test("should add one year correctly", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, 1, "years");
        expect(result.toISOString()).toBe(
          new Date("2025-01-15T10:30:00Z").toISOString(),
        );
      });
      test("should add multiple years correctly", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, 5, "years");
        expect(result.toISOString()).toBe(
          new Date("2029-01-15T10:30:00Z").toISOString(),
        );
      });
      test("should handle negative years", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, -2, "years");
        expect(result.toISOString()).toBe(
          new Date("2022-01-15T10:30:00Z").toISOString(),
        );
      });
      test("should handle leap year to non-leap year (Feb 29)", () => {
        const date = new Date("2024-02-29T10:30:00Z");
        const result = addTime(date, 1, "years");
        // Feb 29, 2024 + 1 year = March 1, 2025 (2025 is not a leap year)
        expect(result.toISOString()).toBe(
          new Date("2025-03-01T10:30:00Z").toISOString(),
        );
      });
    });
    suite("immutability and edge cases", () => {
      test("should not mutate the original date", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const originalTime = date.getTime();
        addTime(date, 5, "days");
        expect(date.getTime()).toBe(originalTime);
      });
      test("should handle zero length", () => {
        const date = new Date("2024-01-15T10:30:00Z");
        const result = addTime(date, 0, "days");
        expect(result.toISOString()).toBe(date.toISOString());
        expect(result).not.toBe(date); // Still creates a new object
      });
      test("should preserve time components across date changes", () => {
        const date = new Date("2024-01-15T23:59:59.999Z");
        const result = addTime(date, 30, "days");
        expect(result.getUTCHours()).toBe(23);
        expect(result.getUTCMinutes()).toBe(59);
        expect(result.getUTCSeconds()).toBe(59);
        expect(result.getUTCMilliseconds()).toBe(999);
      });
      test("should handle DST transitions correctly", () => {
        // This behavior depends on the timezone, but the function should still work
        // This date is just before DST in US Eastern
        const date = new Date("2024-03-10T01:00:00-05:00");
        const result = addTime(date, 2, "hours");
        expect(result.getTime() - date.getTime()).toBe(2 * 60 * 60 * 1000);
      });
    });
  });
  suite("subtractTime", () => {
    test("should subtract days correctly", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = subtractTime(date, 5, "days");
      expect(result.toISOString()).toBe(
        new Date("2024-01-10T10:30:00Z").toISOString(),
      );
    });
    test("should subtract hours correctly", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = subtractTime(date, 3, "hours");
      expect(result.toISOString()).toBe(
        new Date("2024-01-15T07:30:00Z").toISOString(),
      );
    });
    test("should subtract months correctly", () => {
      const date = new Date("2024-05-15T10:30:00Z");
      const result = subtractTime(date, 2, "months");
      expect(result.getUTCMonth()).toBe(2); // March (0-indexed)
      expect(result.getUTCDate()).toBe(15);
      expect([10, 11]).toContain(result.getUTCHours()); // Accept either due to DST
    });
    test("should subtract years correctly", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = subtractTime(date, 2, "years");
      expect(result.toISOString()).toBe(
        new Date("2022-01-15T10:30:00Z").toISOString(),
      );
    });
    test("should be equivalent to addTime with negative length", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const subtractResult = subtractTime(date, 5, "days");
      const addResult = addTime(date, -5, "days");
      expect(subtractResult.toISOString()).toBe(addResult.toISOString());
    });
    test("should not mutate the original date", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const originalTime = date.getTime();
      subtractTime(date, 5, "days");
      expect(date.getTime()).toBe(originalTime);
    });
    test("should handle subtracting zero", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = subtractTime(date, 0, "days");
      expect(result.toISOString()).toBe(date.toISOString());
    });
    test("should handle month-end overflow when subtracting", () => {
      const date = new Date("2024-03-31T10:30:00Z");
      const result = subtractTime(date, 1, "months");
      // March 31 - 1 month = March 2/3 (February doesn't have 31 days)
      expect(result.getUTCMonth()).toBe(2); // March (0-indexed)
    });
    test("should cross year boundaries when subtracting months", () => {
      const date = new Date("2024-02-15T10:30:00Z");
      const result = subtractTime(date, 4, "months");
      expect(result.getUTCFullYear()).toBe(2023);
      expect(result.getUTCMonth()).toBe(9); // October (0-indexed)
      expect(result.getUTCDate()).toBe(15);
      expect([9, 10]).toContain(result.getUTCHours()); // Accept either due to DST
    });
    test("should work with all time units", () => {
      const date = new Date("2024-01-15T10:30:30.500Z");

      expect(subtractTime(date, 100, "milliseconds").getTime()).toBe(
        date.getTime() - 100,
      );
      expect(subtractTime(date, 30, "seconds").toISOString()).toBe(
        new Date("2024-01-15T10:30:00.500Z").toISOString(),
      );
      expect(subtractTime(date, 15, "minutes").toISOString()).toBe(
        new Date("2024-01-15T10:15:30.500Z").toISOString(),
      );
      expect(subtractTime(date, 5, "hours").toISOString()).toBe(
        new Date("2024-01-15T05:30:30.500Z").toISOString(),
      );
      expect(subtractTime(date, 1, "weeks").toISOString()).toBe(
        new Date("2024-01-08T10:30:30.500Z").toISOString(),
      );
    });
  });
});
