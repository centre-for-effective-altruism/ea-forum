import { cache } from "react";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { posts, Tag } from "../schema";

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

export type PostTag = Pick<Tag, "_id" | "name" | "slug" | "core"> & {
  baseScore: number;
};

export const postTagsProjection = (postsTable: typeof posts) =>
  sql<PostTag[]>`
    SELECT ARRAY_AGG(JSONB_BUILD_OBJECT(
      '_id', post_tags."_id",
      'name', post_tags."name",
      'shortName', post_tags."shortName",
      'slug', post_tags."slug",
      'core', post_tags."core",
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
