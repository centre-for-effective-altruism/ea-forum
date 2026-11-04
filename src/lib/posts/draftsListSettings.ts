import { z } from "zod/v4";
import { booleanSchema } from "./allPostsSettings";

export const draftsListLimit = 50;

export const draftsListSortingSchema = z.enum(["lastModified", "newest", "oldest"]);

export type DraftsListSorting = z.infer<typeof draftsListSortingSchema>;

export const draftsListSortings: Record<DraftsListSorting, string> = {
  lastModified: "Last modified",
  newest: "Newest",
  oldest: "Oldest",
};

export const draftsListSettingsSchema = z.object({
  sortDraftsBy: draftsListSortingSchema,
  includeArchived: z.boolean(),
  includeShared: z.boolean(),
});

export type DraftsListSettings = z.infer<typeof draftsListSettingsSchema>;

export type DraftsListUserSettings = {
  draftsListSorting: string | null;
  draftsListShowArchived: boolean | null;
  draftsListShowShared: boolean | null;
};

/**
 * Query params take precedence over the user's saved settings so that links
 * to a particular view of the drafts list keep working.
 */
export const resolveDraftsListSettings = (
  query: Record<string, string | string[] | undefined>,
  userSettings: DraftsListUserSettings,
): DraftsListSettings => {
  const savedSorting = draftsListSortingSchema
    .catch("lastModified")
    .parse(userSettings.draftsListSorting);
  return {
    sortDraftsBy: draftsListSortingSchema
      .catch(savedSorting)
      .parse(query.sortDraftsBy),
    includeArchived: booleanSchema
      .catch(!!userSettings.draftsListShowArchived)
      .parse(query.includeArchived),
    includeShared: booleanSchema
      .catch(userSettings.draftsListShowShared !== false)
      .parse(query.includeShared),
  };
};
