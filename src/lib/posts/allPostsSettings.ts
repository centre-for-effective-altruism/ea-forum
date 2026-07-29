import { z } from "zod/v4";

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

export const allPostsSettingsSchema = z.object({
  timeframe: z
    .enum(["allTime", "daily", "weekly", "monthly", "yearly", "exponential"])
    .catch("daily"),
  sortedBy: z
    .enum(["magic", "top", "topAdjusted", "recentComments", "new", "old"])
    .catch("magic"),
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
