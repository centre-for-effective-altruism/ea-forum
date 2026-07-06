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
      },
    },
    sequence: {
      columns: {
        _id: true,
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
