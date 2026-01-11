import { cache } from "react";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

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

export const fetchPostTags = async (tagRelevance: Record<string, number>) => {
  const tagIds = Object.keys(tagRelevance).filter((_id) => tagRelevance[_id] >= 1);
  const tags = await db.query.tags.findMany({
    columns: {
      _id: true,
      name: true,
      slug: true,
      core: true,
    },
    extras: {
      baseScore: sql<number>`0`,
    },
    where: {
      _id: { in: tagIds },
    },
  });
  for (const tag of tags) {
    tag.baseScore = tagRelevance[tag._id];
  }
  return tags;
};

export type PostTag = Awaited<ReturnType<typeof fetchPostTags>>[0];
