import { sql } from "drizzle-orm";
import { db } from "../db";
import { posts } from "../schema";
import type { RelationalProjection } from "../utils/queryHelpers";

export type UserRelationalProjection = RelationalProjection<typeof db.query.users>;

export type UserFromProjection<TConfig extends UserRelationalProjection> = Awaited<
  ReturnType<typeof db.query.users.findMany<TConfig>>
>[number];

/**
 * Basic user projection. When updating this you must also update `coauthorsSelector`
 */
export const userBaseProjection = {
  columns: {
    _id: true,
    slug: true,
    displayName: true,
    username: true,
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
    biographyHtml: (users, { sql }) => sql<string>`${users}."biography"->>'html'`,
  },
} as const satisfies UserRelationalProjection;

export type UserBase = UserFromProjection<typeof userBaseProjection>;

/**
 * Due to limitations in drizzle this has to be raw SQL, but the projection should
 * match `userBaseProjection` above.
 * Also see https://github.com/drizzle-team/drizzle-orm/issues/4988
 */
export const coauthorsSelector = (postsTable: typeof posts) => sql<
  UserBase[] | null
>`(
  SELECT ARRAY_AGG(JSONB_BUILD_OBJECT(
    '_id', coauthor."_id",
    'slug', coauthor."slug",
    'displayName', coauthor."displayName",
    'username', coauthor."username",
    'createdAt', coauthor."createdAt",
    'profileImageId', coauthor."profileImageId",
    'karma', coauthor."karma",
    'jobTitle', coauthor."jobTitle",
    'organization', coauthor."organization",
    'postCount', coauthor."postCount",
    'commentCount', coauthor."commentCount",
    'deleted', coauthor."deleted",
    'biographyHtml', coauthor."biography"->>'html'
  ))
  FROM "Users" coauthor
  WHERE
    coauthor."_id" = ANY(${postsTable}."coauthorUserIds")
    AND coauthor."deleted" IS NOT TRUE
)`;

export const fetchUserForReview = (userId: string) =>
  db.query.users.findFirst({
    columns: {
      _id: true,
      reviewedByUserId: true,
      snoozedUntilContentCount: true,
      usersContactedBeforeReview: true,
      mapLocation: true,
      postCount: true,
      commentCount: true,
      biography: true,
      website: true,
      profileImageId: true,
    },
    where: {
      _id: userId,
    },
  });

export type UserForReview = NonNullable<
  Awaited<ReturnType<typeof fetchUserForReview>>
>;
