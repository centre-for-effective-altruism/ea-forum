import { expect, suite, test } from "vitest";
import {
  getTimezoneOffsetMinutes,
  gmtToLocalTimeOfWeek,
  localToGmtTimeOfWeek,
} from "@/components/UserSettings/timeOfWeek";

const winter = new Date("2024-01-10T12:00:00Z");
const summer = new Date("2024-07-10T12:00:00Z");

suite("User settings time of week conversion", () => {
  test("gets timezone offsets including DST and fractional hours", () => {
    expect(getTimezoneOffsetMinutes("GMT", winter)).toBe(0);
    expect(getTimezoneOffsetMinutes("America/New_York", winter)).toBe(-300);
    expect(getTimezoneOffsetMinutes("America/New_York", summer)).toBe(-240);
    expect(getTimezoneOffsetMinutes("Asia/Kolkata", winter)).toBe(330);
  });

  test("wraps back across the start of the week", () => {
    expect(
      gmtToLocalTimeOfWeek(
        { timeOfDay: 2, dayOfWeek: "Sunday" },
        "America/New_York",
        winter,
      ),
    ).toEqual({ timeOfDay: 21, dayOfWeek: "Saturday" });
  });

  test("wraps forward across the end of the week", () => {
    expect(
      gmtToLocalTimeOfWeek(
        { timeOfDay: 20, dayOfWeek: "Saturday" },
        "Pacific/Auckland",
        winter,
      ),
    ).toEqual({ timeOfDay: 9, dayOfWeek: "Sunday" });
    expect(
      localToGmtTimeOfWeek(
        { timeOfDay: 9, dayOfWeek: "Sunday" },
        "Pacific/Auckland",
        winter,
      ),
    ).toEqual({ timeOfDay: 20, dayOfWeek: "Saturday" });
  });

  test("round trips every hour in fractional-offset timezones", () => {
    for (const timeZone of ["Asia/Kolkata", "America/St_Johns"]) {
      for (let timeOfDay = 0; timeOfDay < 24; timeOfDay++) {
        const timeGMT = { timeOfDay, dayOfWeek: "Wednesday" } as const;
        const local = gmtToLocalTimeOfWeek(timeGMT, timeZone, winter);
        expect(localToGmtTimeOfWeek(local, timeZone, winter)).toEqual(timeGMT);
      }
    }
  });
});
