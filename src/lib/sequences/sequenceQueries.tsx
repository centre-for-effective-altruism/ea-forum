import type { RelationalProjection } from "../utils/queryHelpers";
import { userBaseProjection } from "../users/userQueries";
import { db } from "../db";

export type SequenceRelationalProjection = RelationalProjection<
  typeof db.query.sequences
>;

export type SequenceFromProjection<TConfig extends SequenceRelationalProjection> =
  Awaited<ReturnType<typeof db.query.sequences.findMany<TConfig>>>[number];

export const sequenceBaseProjection = {
  columns: {
    _id: true,
    title: true,
  },
  with: {
    user: userBaseProjection,
    chapters: {
      columns: {
        title: true,
        number: true,
        postIds: true,
      },
    },
  },
} as const satisfies SequenceRelationalProjection;

export type SequenceBase = SequenceFromProjection<typeof sequenceBaseProjection>;
