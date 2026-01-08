/** TagDefault relies on there being a FilterMode on the tag */
export const FILTER_MODE_CHOICES = [
  "Hidden",
  "Default",
  "Required",
  "Subscribed",
  "Reduced",
] as const;

type FilterMode =
  | (typeof FILTER_MODE_CHOICES)[number]
  | "TagDefault"
  | number
  | `x${number}`;

type FilterTag = {
  tagId: string;
  tagName: string;
  filterMode: FilterMode;
};

export type FilterSettings = {
  personalBlog: FilterMode;
  tags: FilterTag[];
};

const defaultVisibilityTags = process.env.COMMUNITY_TAG_ID
  ? [
      {
        tagId: process.env.COMMUNITY_TAG_ID,
        tagName: "Community",
        filterMode: "TagDefault",
      } as const,
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
  return mode === "Subscribed" ? 25 : 0;
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
