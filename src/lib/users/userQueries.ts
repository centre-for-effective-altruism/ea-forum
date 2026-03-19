import { and, eq, ne, sql } from "drizzle-orm";
import { db, DbOrTransaction } from "../db";
import { posts, users } from "../schema";
import type { CurrentUser } from "./currentUser";
import type { RelationalProjection } from "../utils/queryHelpers";
import { filterNonNull } from "../typeHelpers";
import keyBy from "lodash/keyBy";

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

export const updateExpandedSection = async (
  currentUserId: string,
  section: string,
  expanded: boolean,
) => {
  await db
    .update(users)
    .set({
      expandedFrontpageSections: sql`
        COALESCE("expandedFrontpageSections", '{}'::JSONB) || fm_build_nested_jsonb(
          ('{' || ${section} || '}')::TEXT[],
          ${expanded}::JSONB
        )
      `,
    })
    .where(eq(users._id, currentUserId));
};

export const isDisplayNameTaken = async (
  currentUser: CurrentUser,
  displayName: string,
  txn: DbOrTransaction = db,
): Promise<boolean> => {
  const result = await txn
    .select({
      isTaken: sql<boolean>`COUNT(*) > 0`,
    })
    .from(users)
    .where(
      and(
        sql`fm_normalize_display_name(${users.displayName}) =
          fm_normalize_display_name(${displayName})`,
        ne(users._id, currentUser._id),
      ),
    );
  return !!result[0]?.isTaken;
};

export const fetchOnboardingUsers = async () => {
  const _ids = [
    "9Fg4woeMPHoGa6kDA", // Holden Karnofsky
    "kBZnCSYFXGowSD8mD", // Katja Grace
    "b4mnJTtwXMkqkv3Yq", // Laura Duffy
    "DkFp3vmyWxPmDqNcp", // Richard Y Chappell
    "H3tBLXCQEMqkyJiMJ", // Kelsey Piper
    "LMgZyi4w3XoYz3tM5", // sauilius
    "R4mvcEPhmLiBahN4H", // Toby Ord
    "JBx8HXhshWMMKpafM", // Jacob_Peacock
    "Ng9dxDSsc5uK4Zsmx", // CarlShulman
    "J8rxnfpHSTCbDNC2j", // Joe_Carlsmith
  ];
  const users = await db.query.users.findMany({
    columns: {
      _id: true,
      displayName: true,
      profileImageId: true,
      karma: true,
      jobTitle: true,
      organization: true,
    },
    where: {
      _id: { in: _ids },
      deleted: false,
      banned: { isNull: true },
    },
  });
  const byId = keyBy(users, "_id");
  return filterNonNull(_ids.map((id) => byId[id]));
};

export type OnboardingUser = Awaited<
  ReturnType<typeof fetchOnboardingUsers>
>[number];
