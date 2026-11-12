import { type DayOfWeek, daysOfWeek } from "@/lib/timeUtils";

export type TimeOfWeek = {
  timeOfDay: number;
  dayOfWeek: DayOfWeek;
};

const HOURS_PER_DAY = 24;
const HOURS_PER_WEEK = HOURS_PER_DAY * daysOfWeek.length;
const MS_PER_MINUTE = 60_000;

export const getTimezoneOffsetMinutes = (timeZone: string, date: Date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, Number(value)]),
  );
  const wallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
  const dateToMinute = Math.floor(date.getTime() / MS_PER_MINUTE) * MS_PER_MINUTE;
  return (wallClockAsUtc - dateToMinute) / MS_PER_MINUTE;
};

const shiftTimeOfWeek = (
  { timeOfDay, dayOfWeek }: TimeOfWeek,
  offsetMinutes: number,
  roundHours: (hours: number) => number,
): TimeOfWeek => {
  const hourOfWeek = roundHours(
    daysOfWeek.indexOf(dayOfWeek) * HOURS_PER_DAY + timeOfDay + offsetMinutes / 60,
  );
  const wrappedHourOfWeek =
    ((hourOfWeek % HOURS_PER_WEEK) + HOURS_PER_WEEK) % HOURS_PER_WEEK;
  return {
    timeOfDay: wrappedHourOfWeek % HOURS_PER_DAY,
    dayOfWeek: daysOfWeek[Math.floor(wrappedHourOfWeek / HOURS_PER_DAY)],
  };
};

/**
 * Rounding down here and up in `localToGmtTimeOfWeek` keeps the round trip
 * stable in timezones with fractional-hour offsets
 */
export const gmtToLocalTimeOfWeek = (
  timeGMT: TimeOfWeek,
  timeZone: string,
  now = new Date(),
) => shiftTimeOfWeek(timeGMT, getTimezoneOffsetMinutes(timeZone, now), Math.floor);

export const localToGmtTimeOfWeek = (
  timeLocal: TimeOfWeek,
  timeZone: string,
  now = new Date(),
) => shiftTimeOfWeek(timeLocal, -getTimezoneOffsetMinutes(timeZone, now), Math.ceil);

export const getTimezoneAbbreviation = (timeZone: string, now = new Date()) =>
  new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(now)
    .find(({ type }) => type === "timeZoneName")?.value ?? timeZone;
