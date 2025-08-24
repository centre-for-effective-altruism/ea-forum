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

export const formatShortDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export const formatLongDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export const formatLongDateWithTime = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const nDaysAgo = (n: number) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date;
};
