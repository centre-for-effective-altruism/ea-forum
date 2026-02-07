import { cache } from "react";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { htmlSubstring, RelationalProjection } from "../utils/queryHelpers";
import type { comments, posts, Tag } from "../schema";

export type TagRelationalProjection = RelationalProjection<typeof db.query.tags>;

export type TagFromProjection<TConfig extends TagRelationalProjection> = Awaited<
  ReturnType<typeof db.query.tags.findMany<TConfig>>
>[number];

export const fetchCoreTags = cache(() => {
  return db.query.tags.findMany({
    columns: {
      _id: true,
      name: true,
      shortName: true,
      slug: true,
    },
    where: {
      core: true,
      wikiOnly: false,
      deleted: false,
    },
    orderBy: {
      defaultOrder: "desc",
      name: "asc",
    },
  });
});

export type CoreTag = Awaited<ReturnType<typeof fetchCoreTags>>[0];

export type PostTag = Pick<Tag, "_id" | "name" | "slug" | "core" | "postCount"> & {
  description: string | null;
  baseScore: number;
};

export const postTagsProjection = (postsTable: typeof posts) =>
  sql<PostTag[] | null>`
    SELECT ARRAY_AGG(JSONB_BUILD_OBJECT(
      '_id', post_tags."_id",
      'name', post_tags."name",
      'slug', post_tags."slug",
      'core', post_tags."core",
      'description', ${htmlSubstring(sql`post_tags."description"->>'html'`)},
      'postCount', post_tags."postCount",
      'baseScore', rel."baseScore"::INTEGER
    ))
    FROM "Posts" post_for_tags
    JOIN LATERAL JSONB_EACH(post_for_tags."tagRelevance")
      AS rel("tagId", "baseScore") ON TRUE
    INNER JOIN "Tags" post_tags ON post_tags."_id" = rel."tagId"
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
