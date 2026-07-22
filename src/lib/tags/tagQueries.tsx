import { cache } from "react";
import { sql } from "drizzle-orm";
import keyBy from "lodash/keyBy";
import { db } from "@/lib/db";
import { filterNonNull } from "../typeHelpers";
import { htmlSubstring, RelationalProjection } from "../utils/queryHelpers";
import type { comments, posts, Tag } from "../schema";
import type { VoteType } from "../votes/voteHelpers";

export type TagRelationalProjection = RelationalProjection<typeof db.query.tags>;

export type TagFromProjection<TConfig extends TagRelationalProjection> = Awaited<
  ReturnType<typeof db.query.tags.findMany<TConfig>>
>[number];

const tagBaseProjection = {
  columns: {
    _id: true,
    name: true,
    shortName: true,
    slug: true,
    postCount: true,
    core: true,
  },
  extras: {
    description: htmlSubstring(sql`"description"->>'html'`),
  },
} satisfies TagRelationalProjection;

export type TagBase = TagFromProjection<typeof tagBaseProjection>;

export const fetchCoreTags = cache((limit?: number): Promise<TagBase[]> => {
  return db.query.tags.findMany({
    ...tagBaseProjection,
    where: {
      core: true,
      wikiOnly: false,
      deleted: false,
    },
    orderBy: {
      defaultOrder: "desc",
      name: "asc",
    },
    limit,
  });
});

export const fetchTagBySlug = async (slug: string): Promise<TagBase | null> => {
  const result = await db.query.tags.findFirst({
    ...tagBaseProjection,
    where: {
      slug,
      deleted: false,
    },
  });
  return result ?? null;
};

export const fetchTagsByIds = async (
  tagIds: string[],
): Promise<Record<string, TagBase>> => {
  const result = await db.query.tags.findMany({
    ...tagBaseProjection,
    where: {
      _id: { in: tagIds },
      deleted: false,
    },
  });
  return keyBy(result, "_id");
};

export type PostTagRel = {
  _id: string;
  baseScore: number;
  voteType?: VoteType;
};

export type PostTag = Pick<Tag, "_id" | "name" | "slug" | "core" | "postCount"> & {
  description: string | null;
  tagRel: PostTagRel;
};

// TODO: It'd be really nice to do this in Drizzle instead of raw SQL, but it
// doesn't seem possible with the current Drizzle API without tidying up the DB.
export const postTagsProjection = (
  postsTable: typeof posts,
  currentUserId: string | null,
) =>
  sql<PostTag[] | null>`
    SELECT ARRAY_AGG(JSONB_BUILD_OBJECT(
      '_id', post_tag."_id",
      'name', post_tag."name",
      'slug', post_tag."slug",
      'core', post_tag."core",
      'description', ${htmlSubstring(sql`post_tag."description"->>'html'`)},
      'postCount', post_tag."postCount",
      'tagRel', JSONB_BUILD_OBJECT(
        '_id', tagrel."_id",
        'baseScore', rel."baseScore"::INTEGER,
        'voteType', vote."voteType"
      )
    ))
    FROM "Posts" post_for_tags
    JOIN LATERAL JSONB_EACH(post_for_tags."tagRelevance")
      AS rel("tagId", "baseScore") ON TRUE
    INNER JOIN "Tags" post_tag ON post_tag."_id" = rel."tagId"
    INNER JOIN "TagRels" tagrel ON
      tagrel."postId" = post_for_tags."_id"
      AND tagrel."tagId" = post_tag."_id"
      AND tagrel."deleted" IS NOT TRUE
    LEFT JOIN "Votes" vote ON
      ${currentUserId !== null}
      AND vote."collectionName" = 'TagRels'
      AND vote."documentId" = tagrel."_id"
      AND vote."userId" = ${currentUserId}
      AND vote."cancelled" IS NOT TRUE
      AND vote."isUnvote" IS NOT TRUE
    WHERE
      post_for_tags."_id" = ${postsTable}."_id"
      AND rel."baseScore"::INTEGER > 0
  `;

export type CommentTag = Pick<
  Tag,
  "name" | "shortName" | "slug" | "core" | "postCount"
> & { description: string | null };

export const commentTagsProjection = (commentsTable: typeof comments) =>
  sql<CommentTag[] | null>`
    SELECT ARRAY_AGG(JSONB_BUILD_OBJECT(
      'name', comment_tags."name",
      'shortName', comment_tags."shortName",
      'slug', comment_tags."slug",
      'core', comment_tags."core",
      'description', ${htmlSubstring(sql`comment_tags."description"->>'html'`)},
      'postCount', comment_tags."postCount"
    ))
    FROM "Comments" comment_for_tags
    INNER JOIN "Tags" comment_tags
      ON comment_tags."_id" = ANY(comment_for_tags."relevantTagIds")
    WHERE
      comment_for_tags."_id" = ${commentsTable}."_id"
  `;

export const fetchOnboardingTags = async () => {
  const _ids = [
    "sWcuTyTB5dP3nas2t", // Global health and development
    "QdH9f8TC6G8oGYdgt", // Animal welfare
    "ee66CtAMYurQreWBH", // Existential risk
    "H43gvLzBCacxxamPe", // Biosecurity and pandemics
    "oNiQsBHA3i837sySD", // AI safety
    "4eyeLKC64Yvznzt6Z", // Philosophy
    "EHLmbEmJ2Qd5WfwTb", // Building effective altruism
    "aJnrnnobcBNWRsfAw", // Forecasting and estimation
    "psBzwdY8ipfCeExJ7", // Cause prioritisation
    "4CH9vsvzyk4mSKwyZ", // Career choice
  ];
  const tags = await db.query.tags.findMany({
    columns: {
      _id: true,
      name: true,
      shortName: true,
      slug: true,
      bannerImageId: true,
      squareImageId: true,
    },
    where: {
      _id: { in: _ids },
      deleted: false,
    },
  });
  const byId = keyBy(tags, "_id");
  return filterNonNull(_ids.map((id) => byId[id]));
};

export type OnboardingTag = Awaited<ReturnType<typeof fetchOnboardingTags>>[number];

export const fetchUserProfileTagRevisions = async ({
  userId,
  limit = 10,
  offset = 0,
}: {
  userId: string;
  limit?: number;
  offset?: number;
}) => {
  return await db.query.revisions.findMany({
    columns: {
      _id: true,
      changeMetrics: true,
      editedAt: true,
      createdAt: true,
    },
    with: {
      tag: {
        columns: {
          _id: true,
          name: true,
          slug: true,
        },
      },
    },
    where: {
      tag: {
        _id: { isNotNull: true },
      },
      userId,
      collectionName: "Tags",
      fieldName: "description",
    },
    orderBy: {
      editedAt: "desc",
      createdAt: "desc",
      _id: "asc",
    },
    limit,
    offset,
  });
};

export type TagRevision = Awaited<
  ReturnType<typeof fetchUserProfileTagRevisions>
>[number];
