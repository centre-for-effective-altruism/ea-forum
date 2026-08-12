export const formatStat = (value?: number): string => {
  value ??= 0;
  return value >= 10000
    ? `${Math.floor(value / 1000)} ${String(value % 1000).padStart(3, "0")}`
    : String(value);
};

export const formatRole = (
  jobTitle?: string | null,
  organization?: string | null,
): string =>
  jobTitle && organization
    ? `${jobTitle} @ ${organization}`
    : ((jobTitle || organization) ?? "");

export const formatThousands = (amount: number) =>
  new Intl.NumberFormat("en-US").format(amount);

export const formatPostItemHiddenAuthors = (count: number, totalShown: number) =>
  totalShown === 0 ? `${count} author${count === 1 ? "" : "s"}` : `+ ${count} more`;

export const formatPercent = (x: number | null | undefined) =>
  typeof x === "number" ? `${Math.round(x * 100)}%` : "–";

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  timeZone: "UTC",
});

export const formatDateRange = (
  startDate: Date | string,
  endDate: Date | string,
) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startFormatted = monthDayFormatter.format(start);
  const endFormatted =
    start.getUTCMonth() === end.getUTCMonth()
      ? dayFormatter.format(end)
      : monthDayFormatter.format(end);
  return `${startFormatted} - ${endFormatted}`;
};
