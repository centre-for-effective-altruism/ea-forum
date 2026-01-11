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

const yearFormatIfNotCurrent = (date: Date) =>
  date.getFullYear() === new Date().getFullYear()
    ? null
    : ({ year: "numeric" } as const);

export const formatShortDate = (when: Date | string) => {
  const date = when instanceof Date ? when : new Date(when);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...yearFormatIfNotCurrent(date),
  });
};

export const formatLongDate = (when: Date | string) => {
  const date = when instanceof Date ? when : new Date(when);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...yearFormatIfNotCurrent(date),
  });
};

export const formatLongDateWithTime = (when: Date | string) => {
  const date = when instanceof Date ? when : new Date(when);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...yearFormatIfNotCurrent(date),
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const nDaysAgo = (n: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - n);
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
