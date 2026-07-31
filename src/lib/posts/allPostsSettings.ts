import { z } from "zod/v4";
import { isToday } from "../timeUtils";

export const ALL_POSTS_LOW_KARMA_THRESHOLD = -10;

const booleanSchema = z.preprocess((value) => {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
}, z.boolean());

export const allPostsSortedBySchema = z
  .enum(["magic", "top", "topAdjusted", "recentComments", "new", "old"])
  .catch("magic");

export const allPostsSettingsSchema = z.object({
  timeframe: z
    .enum(["allTime", "daily", "weekly", "monthly", "yearly", "exponential"])
    .catch("daily"),
  sortedBy: allPostsSortedBySchema,
  filter: z
    .enum(["all", "frontpage", "curated", "questions", "events", "linkpost"])
    .catch("all"),
  showLowKarma: booleanSchema.catch(false),
  showEvents: booleanSchema.catch(false),
  showCommunity: booleanSchema.catch(true),
});

export type AllPostsSettings = z.infer<typeof allPostsSettingsSchema>;
export type AllPostsTimeframe = AllPostsSettings["timeframe"];
export type AllPostsSortedBy = AllPostsSettings["sortedBy"];
export type AllPostsFilter = AllPostsSettings["filter"];

export const allPostsSettingsFromQuery = (
  query: Record<string, string>,
): AllPostsSettings => allPostsSettingsSchema.parse(query);

type AllPostsSettingConfig = {
  label: string;
  tooltip?: string;
};

export const allPostsTimeframes: Record<AllPostsTimeframe, AllPostsSettingConfig> = {
  allTime: { label: "All time" },
  daily: { label: "Daily" },
  weekly: { label: "Weekly" },
  monthly: { label: "Monthly" },
  yearly: { label: "Yearly" },
  exponential: { label: "Exponential" },
};

export const allPostsSortedBys: Record<AllPostsSortedBy, AllPostsSettingConfig> = {
  magic: {
    label: "New & upvoted",
    tooltip: "Posts with the highest karma from the past few days",
  },
  top: { label: "Top" },
  topAdjusted: {
    label: "Top (inflation-adjusted)",
    tooltip:
      "Posts with the highest karma relative to those posted around the same time",
  },
  recentComments: { label: "Recent comments" },
  new: { label: "New" },
  old: { label: "Old" },
};

export const allPostsFilters: Record<AllPostsFilter, AllPostsSettingConfig> = {
  all: {
    label: "All posts",
    tooltip:
      "Includes personal blogposts as well as frontpage, questions, and community posts",
  },
  frontpage: {
    label: "Frontpage",
    tooltip: "Posts about research and other work in high-impact cause areas",
  },
  curated: {
    label: "Curated",
    tooltip:
      "Posts chosen by the moderation team to be well written and important (approximately weekly)",
  },
  questions: {
    label: "Questions",
    tooltip:
      "Open questions and answers, ranging from newcomer questions to important unsolved scientific problems",
  },
  events: {
    label: "Events",
    tooltip: "Events from around the world",
  },
  linkpost: {
    label: "Linkposts",
    tooltip: "Repost or links to content from elsewhere on the web",
  },
};

export type TimeblockTimeframe = "daily" | "weekly" | "monthly" | "yearly";

export type AllPostsTimeblockSettings = Omit<AllPostsSettings, "timeframe"> & {
  timeframe: TimeblockTimeframe;
};

export const getInitialBlockCount = (timeframe: TimeblockTimeframe) =>
  timeframe === "daily" ? 10 : 4;

const getCurrentTimeblock = (
  timeframe: TimeblockTimeframe,
  now: Date = new Date(),
): { after: Date; before: Date } => {
  const after = new Date(now);
  const before = new Date(now);
  switch (timeframe) {
    case "daily":
      after.setHours(0, 0, 0, 0);
      before.setHours(23, 59, 59, 999);
      break;
    case "weekly": {
      const day = now.getDay();
      const daysSinceMonday = (day + 6) % 7;
      const daysUntilSunday = (7 - day) % 7;
      after.setDate(after.getDate() - daysSinceMonday);
      after.setHours(0, 0, 0, 0);
      before.setDate(before.getDate() + daysUntilSunday);
      before.setHours(23, 59, 59, 999);
      break;
    }
    case "monthly":
      after.setDate(1);
      after.setHours(0, 0, 0, 0);
      before.setMonth(before.getMonth() + 1, 0);
      before.setHours(23, 59, 59, 999);
      break;
    case "yearly":
      after.setMonth(0, 1);
      after.setHours(0, 0, 0, 0);
      before.setMonth(11, 31);
      before.setHours(23, 59, 59, 999);
      break;
  }
  return { after, before };
};

const getPreviousTimeblock = (
  timeframe: TimeblockTimeframe,
  range: { after: Date; before: Date },
): { after: Date; before: Date } => {
  const after = new Date(range.after);
  const before = new Date(range.before);
  switch (timeframe) {
    case "daily":
      after.setDate(after.getDate() - 1);
      before.setDate(before.getDate() - 1);
      break;
    case "weekly":
      after.setDate(after.getDate() - 7);
      before.setDate(before.getDate() - 7);
      break;
    case "monthly":
      after.setMonth(after.getMonth() - 1);
      before.setMonth(before.getMonth() - 1);
      break;
    case "yearly":
      after.setFullYear(after.getFullYear() - 1);
      before.setFullYear(before.getFullYear() - 1);
      break;
  }
  return { after, before };
};

export const getTimeblockDateRanges = (
  timeframe: TimeblockTimeframe,
  numBlocks: number = getInitialBlockCount(timeframe),
): { after: Date; before: Date }[] => {
  const ranges: { after: Date; before: Date }[] = [];
  let range = getCurrentTimeblock(timeframe);
  for (let i = 0; i < numBlocks; i++) {
    ranges.push(range);
    range = getPreviousTimeblock(timeframe, range);
  }
  return ranges;
};

const yearlyFormatter = new Intl.DateTimeFormat("en", { year: "numeric" });
const monthlyFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});
const dayMobileFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dayDesktopFormatter = new Intl.DateTimeFormat("en", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const getTimeblockTitle = (
  timeframe: TimeblockTimeframe,
  startDate: Date,
  size: "mobile" | "desktop",
) => {
  if (timeframe === "yearly") {
    return yearlyFormatter.format(startDate);
  }
  if (timeframe === "monthly") {
    return monthlyFormatter.format(startDate);
  }
  const formatter = size === "mobile" ? dayMobileFormatter : dayDesktopFormatter;
  const result = formatter.format(startDate);
  if (timeframe === "weekly") {
    return `Week of ${result}`;
  }
  return isToday(startDate) ? result.replace(/^[^,]+,/, "Today,") : result;
};

export const loadMoreTimeframeStrings: Record<TimeblockTimeframe, string> = {
  daily: "days",
  weekly: "weeks",
  monthly: "months",
  yearly: "years",
};
