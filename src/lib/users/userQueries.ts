import { db } from "../db";
import type { RelationalProjection } from "../utils/queryHelpers";

export type UserRelationalProjection = RelationalProjection<typeof db.query.users>;

export const userDefaultProjection = {
  columns: {
    _id: true,
    slug: true,
    displayName: true,
    createdAt: true,
    profileImageId: true,
    karma: true,
    jobTitle: true,
    organization: true,
    postCount: true,
    commentCount: true,
    deleted: true,
  },
  extras: {
    biographyHtml: (users, { sql }) => sql<string>`${users}.biography->>'html'`,
  },
} as const satisfies UserRelationalProjection;
