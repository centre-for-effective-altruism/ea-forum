import { cache } from "react";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { filterNonNull } from "../typeHelpers";
import { userIsAdminOrMod } from "../users/userHelpers";
import type { CurrentUser } from "../users/currentUser";
import {
  fetchTagsByIds,
  type TagFromProjection,
  type TagRelationalProjection,
} from "./tagQueries";

const topicPageProjection = {
  columns: {
    _id: true,
    name: true,
    shortName: true,
    slug: true,
    oldSlugs: true,
    core: true,
    bannerImageId: true,
    subtitle: true,
    descriptionTruncationCount: true,
    postCount: true,
    wikiOnly: true,
    noindex: true,
    deleted: true,
    adminOnly: true,
    canEditUserIds: true,
    parentTagId: true,
    subTagIds: true,
    introSequenceId: true,
    postsDefaultSortOrder: true,
    htmlWithContributorAnnotations: true,
    contributionStats: true,
  },
  extras: {
    descriptionHtml: (tagsTable) =>
      sql<string | null>`${tagsTable}."description"->>'html'`,
  },
} satisfies TagRelationalProjection;

export const fetchTopicPageCached = cache(
  async (currentUser: CurrentUser | null, slug: string) => {
    const matches = await db.query.tags.findMany({
      ...topicPageProjection,
      where: {
        OR: [
          { slug },
          {
            RAW: (tagsTable) =>
              sql<boolean>`${tagsTable}."oldSlugs" @> ARRAY[${slug}]`,
          },
        ],
        deleted: userIsAdminOrMod(currentUser) ? undefined : false,
      },
      orderBy: { deleted: "asc", createdAt: "asc" },
    });
    const tag = matches.find((match) => match.slug === slug) ?? matches[0];
    if (!tag) {
      return null;
    }
    const relatedIds = filterNonNull([tag.parentTagId, ...tag.subTagIds]);
    const relatedTags = relatedIds.length ? await fetchTagsByIds(relatedIds) : {};
    return {
      ...tag,
      parentTag: tag.parentTagId ? (relatedTags[tag.parentTagId] ?? null) : null,
      subTags: filterNonNull(tag.subTagIds.map((id) => relatedTags[id])),
    };
  },
);

export type TopicPageTag = NonNullable<
  Awaited<ReturnType<typeof fetchTopicPageCached>>
>;

export type TopicPageLayout = "core" | "normal";

export const getTopicPageLayout = (
  tag: Pick<TagFromProjection<typeof topicPageProjection>, "core" | "bannerImageId">,
): TopicPageLayout => (tag.core && tag.bannerImageId ? "core" : "normal");
