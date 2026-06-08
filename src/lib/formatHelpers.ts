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

export const formatPostItemHiddenAuthors = (count: number, totalShown: number) =>
  totalShown === 0 ? `${count} authors` : `+ ${count} more`;

export const formatPercent = (x: number | null | undefined) =>
  typeof x === "number" ? `${Math.round(x * 100)}%` : "–";
