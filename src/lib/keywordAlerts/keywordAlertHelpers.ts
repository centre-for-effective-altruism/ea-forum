export const MAX_KEYWORD_LENGTH = 100;
export const MAX_KEYWORD_ALERTS = 100;
export const DEFAULT_KEYWORD_START_DATE = new Date("2010-01-01");

export const normalizeKeyword = (value: string) => value.trim().replace(/\s+/g, " ");

export const getKeywordResultsLink = (keyword: string) =>
  `/keywords/${encodeURIComponent(keyword)}`;

const parseDate = (value: string | undefined) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const parseKeywordDateRange = (
  { start, end }: { start?: string; end?: string },
  now = new Date(),
) => ({
  startDate: parseDate(start) ?? DEFAULT_KEYWORD_START_DATE,
  endDate: parseDate(end) ?? now,
});
