const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const intervals = {
  year: 31536000,
  month: 2592000,
  week: 604800,
  day: 86400,
  hour: 3600,
  minute: 60,
  second: 1,
};

export const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  for (const [unit, seconds] of Object.entries(intervals)) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1) {
      return rtf.format(-interval, unit as keyof typeof intervals);
    }
  }
  return "just now";
};

export const formatShortDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
