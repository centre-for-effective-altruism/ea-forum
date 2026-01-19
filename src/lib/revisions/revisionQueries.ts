import { db } from "../db";
import { RelationalProjection } from "../utils/queryHelpers";

export type RevisionRelationalProjection = RelationalProjection<
  typeof db.query.revisions
>;

export type RevisionFromProjection<TConfig extends RevisionRelationalProjection> =
  Awaited<ReturnType<typeof db.query.revisions.findMany<TConfig>>>[number];
