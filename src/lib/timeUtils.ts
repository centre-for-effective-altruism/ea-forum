const longRtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const shortRtf = new Intl.RelativeTimeFormat("en", { style: "narrow" });

const intervals = {
  year: 31536000,
  month: 2592000,
  week: 604800,
  day: 86400,
  hour: 3600,
  minute: 60,
  second: 1,
};

export const formatRelativeTime = (
  time: Date | string,
  {
    style,
  }: {
    style: "long" | "short";
  } = { style: "long" },
) => {
  const isLong = style === "long";
  const now = new Date();
  const date = time instanceof Date ? time : new Date(time);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  for (const [unit, seconds] of Object.entries(intervals)) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1) {
      const rtf = isLong ? longRtf : shortRtf;
      const formatted = rtf.format(-interval, unit as keyof typeof intervals);
      return isLong ? formatted : formatted.replace(" ago", "");
    }
  }
  return isLong ? "just now" : "now";
};

const locale = "en-US";

const yearFormatIfNotCurrent = (date: Date) =>
  date.getFullYear() === new Date().getFullYear()
    ? null
    : ({ year: "numeric" } as const);

export const formatShortDate = (when: Date | string, timeZone?: string) => {
  const date = when instanceof Date ? when : new Date(when);
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    ...yearFormatIfNotCurrent(date),
    timeZone,
  });
};

export const formatLongDate = (when: Date | string, timeZone?: string) => {
  const date = when instanceof Date ? when : new Date(when);
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    ...yearFormatIfNotCurrent(date),
    timeZone,
  });
};

export const formatLongDateWithTime = (when: Date | string, timeZone?: string) => {
  const date = when instanceof Date ? when : new Date(when);
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    ...yearFormatIfNotCurrent(date),
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
};

export const nDaysAgo = (n: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date;
};

export const nMonthsAgo = (n: number): Date => {
  const date = new Date();
  date.setMonth(date.getMonth() - n);
  return date;
};

export const nHoursAgo = (n: number): Date => {
  const date = new Date();
  date.setHours(date.getHours() - n);
  return date;
};

export const nYearsFromNow = (n: number): Date => {
  const now = new Date();
  const result = new Date(now);
  result.setFullYear(now.getFullYear() + n);
  return result;
};

export const secondsAgo = (since: Date): number =>
  Math.floor((Date.now() - since.getTime()) / 1000);

const HOURS_PER_DAY = 24;

const UNIT_TO_HOURS = {
  milliseconds: 1 / 3_600_000,
  seconds: 1 / 3_600,
  minutes: 1 / 60,
  hours: 1,
  days: HOURS_PER_DAY,
  weeks: 7 * HOURS_PER_DAY,
  months: 30.44 * HOURS_PER_DAY,
  years: 365.24 * HOURS_PER_DAY,
} as const;

export type TimeInterval = keyof typeof UNIT_TO_HOURS;

export const isTimeInterval = (
  maybeInterval: string,
): maybeInterval is TimeInterval => !!UNIT_TO_HOURS[maybeInterval as TimeInterval];

export const intervalToHours = (length: number, interval: TimeInterval): number => {
  const hoursPerUnit = UNIT_TO_HOURS[interval];
  if (!hoursPerUnit) {
    throw new Error(`Unsupported interval: ${interval}`);
  }
  return length * hoursPerUnit;
};

export const addTime = (date: Date, length: number, unit: TimeInterval): Date => {
  const result = new Date(date);
  switch (unit) {
    case "milliseconds":
      result.setTime(result.getTime() + length);
      break;
    case "seconds":
      result.setSeconds(result.getSeconds() + length);
      break;
    case "minutes":
      result.setMinutes(result.getMinutes() + length);
      break;
    case "hours":
      result.setHours(result.getHours() + length);
      break;
    case "days":
      result.setDate(result.getDate() + length);
      break;
    case "weeks":
      result.setDate(result.getDate() + length * 7);
      break;
    case "months":
      result.setMonth(result.getMonth() + length);
      break;
    case "years":
      result.setFullYear(result.getFullYear() + length);
      break;
  }
  return result;
};

export const subtractTime = (date: Date, length: number, unit: TimeInterval): Date =>
  addTime(date, -length, unit);
