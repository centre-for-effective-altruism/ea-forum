import { z } from "zod/v4";

const filterModeSchema = z.union([
  z.enum(["Hidden", "Default", "Required", "Subscribed", "Reduced", "TagDefault"]),
  z.number(),
  z.templateLiteral(["x", z.number()]),
]);

export type FilterMode = z.infer<typeof filterModeSchema>;

const filterTagSchema = z.object({
  tagId: z.string(),
  tagName: z.string(),
  filterMode: filterModeSchema,
});

export type FilterTag = z.infer<typeof filterTagSchema>;

export const filterSettingsSchema = z.object({
  tags: z.array(filterTagSchema).max(100),
  personalBlog: filterModeSchema,
});

export type FilterSettings = z.infer<typeof filterSettingsSchema>;

export const standardFilterModes: FilterMode[] = [
  "Hidden",
  "Default",
  "Required",
  "Subscribed",
  "Reduced",
  0,
  0.5,
  25,
];

const defaultVisibilityTags: FilterTag[] = process.env.COMMUNITY_TAG_ID
  ? [
      {
        tagId: process.env.COMMUNITY_TAG_ID,
        tagName: "Community",
        filterMode: "Hidden",
      },
    ]
  : [];

export const getDefaultFilterSettings = (): FilterSettings => {
  return {
    personalBlog: "Hidden",
    // Default visibility tags are always set with "TagDefault" until the user
    // changes them. But the filter mode in default visibility tags is used as
    // that default. That way, if it gets updated, we don't need to run a
    // migration to update the users.
    tags: defaultVisibilityTags.map((tf) => ({ ...tf, filterMode: "TagDefault" })),
  };
};

export const defaultVisibilityTagById = (id: string) =>
  defaultVisibilityTags.find(({ tagId }) => tagId === id) ?? null;

export const subscribePower = 25;

export const resolveFrontpageFilters = (filterSettings: FilterSettings) => {
  const tagsWithDefaults: FilterTag[] = filterSettings.tags.map((tag) =>
    tag.filterMode === "TagDefault"
      ? {
          tagId: tag.tagId,
          tagName: tag.tagName,
          filterMode:
            defaultVisibilityTags.find((dft) => dft.tagId === tag.tagId)
              ?.filterMode || "Default",
        }
      : tag,
  );
  const tagsRequired = tagsWithDefaults.filter((t) => t.filterMode === "Required");
  const tagsExcluded = tagsWithDefaults.filter((t) => t.filterMode === "Hidden");
  const tagsSoftFiltered = tagsWithDefaults.filter(
    (tag) =>
      tag.filterMode !== "Hidden" &&
      tag.filterMode !== "Required" &&
      tag.filterMode !== "Default" &&
      tag.filterMode !== 0,
  );
  return {
    tagsRequired,
    tagsExcluded,
    tagsSoftFiltered,
  };
};

export const filterModeToAdditiveKarmaModifier = (mode: FilterMode): number => {
  if (typeof mode === "number" && (mode <= 0 || 1 <= mode)) {
    return mode;
  }
  return mode === "Subscribed" ? subscribePower : 0;
};

export const filterModeToMultiplicativeKarmaModifier = (
  mode: FilterMode,
): number => {
  // Example: "x10.0" is a multiplier of 10
  const match = typeof mode === "string" && mode.match(/^x(\d+(?:\.\d+)?)$/);
  if (match) {
    return parseFloat(match[1]);
  }
  if (typeof mode === "number" && 0 < mode && mode < 1) {
    return mode;
  }
  return mode === "Reduced" ? 0.5 : 1;
};

type FilterModeString =
  | `${number}`
  | `+${number}`
  | `-${number}%`
  | "Hidden"
  | "Required"
  | "Subscribed"
  | "Reduced"
  | "";

export const filterModeToString = (mode: FilterMode): FilterModeString => {
  if (typeof mode === "number") {
    if (mode === 25) {
      return "Subscribed";
    }
    if (Math.abs(0.5 - mode) < 0.000000001) {
      return "Reduced";
    }
    if (mode >= 1) {
      return `+${mode}`;
    }
    if (mode > 0) {
      return `-${Math.round((1 - mode) * 100)}%`;
    }
    if (mode === 0) {
      return "";
    }
    return `${mode}`;
  }
  switch (mode) {
    case "Hidden":
    case "Required":
    case "Subscribed":
    case "Reduced":
      return mode;
    case "Default":
    default:
      return "";
  }
};
