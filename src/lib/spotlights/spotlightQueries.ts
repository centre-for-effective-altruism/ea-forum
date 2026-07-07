import type { RelationalProjection } from "../utils/queryHelpers";
import { db } from "../db";

export type SpotlightRelationalProjection = RelationalProjection<
  typeof db.query.spotlights
>;

export type SpotlightFromProjection<TConfig extends SpotlightRelationalProjection> =
  Awaited<ReturnType<typeof db.query.spotlights.findMany<TConfig>>>[number];

export const spotlightBaseProjection = {
  columns: {
    _id: true,
    documentType: true,
    title: true,
    imageId: true,
    imageFadeColor: true,
    startAt: true,
    endAt: true,
  },
  extras: {
    descriptionHtml: (spotlights, { sql }) =>
      sql<string | null>`${spotlights}."description"->>'html'`,
  },
  with: {
    post: {
      columns: {
        _id: true,
        slug: true,
        title: true,
        isEvent: true,
        groupId: true,
      },
    },
    sequence: {
      columns: {
        _id: true,
        title: true,
      },
      with: {
        chapters: {
          columns: {
            number: true,
            postIds: true,
          },
        },
      },
    },
  },
} as const satisfies SpotlightRelationalProjection;

export type SpotlightBase = SpotlightFromProjection<typeof spotlightBaseProjection>;

export const fetchAllSpotlights = async () => {
  return await db.query.spotlights.findMany({
    ...spotlightBaseProjection,
  });
};

export const fetchCurrentSpotlight = async (): Promise<SpotlightBase | null> => {
  const now = new Date().toISOString();
  const result = await db.query.spotlights.findFirst({
    ...spotlightBaseProjection,
    where: {
      startAt: { lte: now },
      endAt: { gt: now },
    },
    orderBy: {
      startAt: "desc",
      _id: "desc",
    },
  });
  return result ?? null;
};

export const fetchSpotlightToEdit = async (_id: string) => {
  return await db.query.spotlights.findFirst({
    where: {
      _id,
    },
    columns: {
      _id: true,
      documentId: true,
      documentType: true,
      title: true,
      imageId: true,
      description: true,
      imageFadeColor: true,
      startAt: true,
      endAt: true,
    },
  });
};

export type SpotlightEdit = NonNullable<
  Awaited<ReturnType<typeof fetchSpotlightToEdit>>
>;
