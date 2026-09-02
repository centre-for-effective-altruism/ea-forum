import { cache } from "react";
import { and, eq, ne, sql } from "drizzle-orm";
import { db, DbOrTransaction } from "../db";
import { posts, users } from "../schema";
import type { CurrentUser } from "./currentUser";
import type { AnyKarmaChange } from "./karmaChangesTypes";
import type {
  RelationalFilter,
  RelationalOrderBy,
  RelationalProjection,
} from "../utils/queryHelpers";
import {
  getSignatureWithNote,
  CareerStageValue,
  userIsAdminOrMod,
  userCanEditUser,
} from "./userHelpers";
import { getReactionsForKarmaChanges } from "../votes/reactions";
import { filterNonNull } from "../typeHelpers";
import keyBy from "lodash/keyBy";
import { updateWithFieldChanges } from "../fieldChanges";

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

type UsersFilter = RelationalFilter<typeof db.query.users>;

type UsersOrderBy = RelationalOrderBy<typeof db.query.users>;

// TODO: Maybe this should be a function that takes the current user and does
// permission checks
const viewableUserFilter = {
  deleted: false,
} as const;

export const fetchUserBase = ({
  where,
  orderBy,
  offset,
  limit,
}: {
  currentUserId: string | null;
  where?: UsersFilter;
  orderBy?: UsersOrderBy;
  offset?: number;
  limit?: number;
}) => {
  return db.query.users.findMany({
    ...userBaseProjection,
    where: {
      ...viewableUserFilter,
      ...where,
    },
    orderBy,
    offset,
    limit,
  });
};

export const fetchUserBySlug = async (
  currentUser: CurrentUser | null,
  slug: string,
) => {
  const result = await fetchUserBase({
    currentUserId: currentUser?._id ?? null,
    where: {
      slug,
    },
    limit: 1,
  });
  return result[0] ?? null;
};

export const fetchUsersById = async (
  currentUser: CurrentUser | null,
  userIds: string[],
) => {
  const result = await fetchUserBase({
    currentUserId: currentUser?._id ?? null,
    where: {
      _id: { in: userIds },
    },
  });
  return keyBy(result, "_id");
};

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

export const updateWork = async (
  currentUser: CurrentUser,
  values: {
    jobTitle?: string | null;
    organization?: string | null;
    careerStage?: CareerStageValue[] | null;
  },
) => {
  await updateWithFieldChanges(db, currentUser, users, currentUser._id, values);
};

export const updateProfileImage = async (
  currentUser: CurrentUser,
  userId: string,
  profileImageId: string | null,
) => {
  if (!userCanEditUser(currentUser, { _id: userId })) {
    throw new Error("Permission denied");
  }
  await updateWithFieldChanges(db, currentUser, users, userId, {
    profileImageId,
  });
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
      OR: [
        { banned: { isNull: true } },
        { banned: { lt: new Date().toISOString() } },
      ],
    },
  });
  const byId = keyBy(users, "_id");
  return filterNonNull(_ids.map((id) => byId[id]));
};

export type OnboardingUser = Awaited<
  ReturnType<typeof fetchOnboardingUsers>
>[number];

export const fetchKarmaChanges = async ({
  userId,
  startDate,
  endDate,
  showNegative = false,
}: {
  userId: string;
  startDate: Date;
  endDate: Date;
  showNegative?: boolean;
}): Promise<AnyKarmaChange[]> => {
  const { publicEmojis, privateEmojis } = getReactionsForKarmaChanges(showNegative);
  const publicSelectors = publicEmojis.map(
    (emoji) =>
      `'${emoji}', ARRAY_AGG(
      DISTINCT JSONB_BUILD_OBJECT(
        '_id', v."userId",
        'displayName', u."displayName",
        'slug', u."slug"
      )
    ) FILTER (WHERE
      v."cancelled" IS NOT TRUE AND
      v."isUnvote" IS NOT TRUE AND
      fm_vote_added_emoji(v."_id", '${emoji}')
    )`,
  );
  const privateSelectors = privateEmojis.map(
    (emoji) =>
      `'${emoji}', NULLIF(COUNT(DISTINCT "userId") FILTER (WHERE
      v."cancelled" IS NOT TRUE AND
      v."isUnvote" IS NOT TRUE AND
      fm_vote_added_emoji(v."_id", '${emoji}')
    ), 0)`,
  );
  const results = await db.execute<AnyKarmaChange>(sql`
    -- fetchKarmaChanges
    SELECT
      q.*,
      post."title",
      post."slug",
      comment._id "commentId",
      COALESCE(comment."postId", post._id) "postId",
      comment."tagCommentType",
      comment."contents"->>'html' "description",
      comment_post."title" "postTitle",
      comment_post."slug" "postSlug",
      COALESCE(comment_tag."_id", revision_tag."_id") "tagId",
      COALESCE(comment_tag."name", revision_tag."name") "tagName",
      COALESCE(comment_tag."slug", revision_tag."slug") "tagSlug"
    FROM (
      SELECT
        v."documentId" "_id",
        v."collectionName",
        CASE
          WHEN (
            SELECT ("karmaChangeNotifierSettings"->'showNegativeKarma')::JSONB =
              TO_JSONB(TRUE)
            FROM "Users"
            WHERE "_id" = ${userId}
          )
            THEN SUM(v."power")
          ELSE
            GREATEST(SUM(v."power"), 0)
          END "scoreChange",
        NULLIF(JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
          ${sql.raw([...publicSelectors, ...privateSelectors].join(",\n"))}
        )), '{}'::JSONB) "addedReacts"
      FROM "Votes" v
      JOIN "Users" u ON v."userId" = u."_id"
      WHERE
        v."userId" <> ${userId} AND
        v."authorIds" @> ARRAY[${userId}::VARCHAR] AND
        NOT (v."authorIds" @> ARRAY[v."userId"]) AND
        v."votedAt" >= ${startDate} AND
        v."votedAt" <= ${endDate} AND
        v."silenceNotification" IS NOT TRUE
      GROUP BY v."documentId", v."collectionName"
    ) q
    LEFT JOIN "Posts" post ON
      q."collectionName" = 'Posts' AND
      q."_id" = post."_id"
    LEFT JOIN "Comments" comment ON
      q."collectionName" = 'Comments' AND
      q."_id" = comment."_id"
    LEFT JOIN "Posts" comment_post ON
      comment."postId" = comment_post."_id"
    LEFT JOIN "Tags" comment_tag ON
      comment."tagId" = comment_tag."_id"
    LEFT JOIN "Revisions" revision ON
      q."collectionName" = 'Revisions' AND
      q."_id" = revision."_id"
    LEFT JOIN "Tags" revision_tag ON
      revision."documentId" = revision_tag."_id"
    WHERE
      "scoreChange" <> 0 OR
      "addedReacts" IS NOT NULL
  `);
  return results.rows;
};

export const appendToSunshineNotes = async ({
  moderatedUserId,
  adminName,
  text,
}: {
  moderatedUserId: string;
  adminName: string;
  text: string;
}): Promise<void> => {
  await db.transaction(async (txn) => {
    const moderatedUser = await txn.query.users.findFirst({
      columns: {
        sunshineNotes: true,
      },
      where: {
        _id: moderatedUserId,
      },
    });
    if (!moderatedUser) {
      throw new Error("Invalid userId in appendToSunshineNotes");
    }
    const newNote = getSignatureWithNote(adminName, text);
    const oldNotes = moderatedUser.sunshineNotes || "";
    const updatedNotes = `${newNote}${oldNotes}`;
    await txn
      .update(users)
      .set({
        sunshineNotes: updatedNotes,
      })
      .where(eq(users._id, moderatedUserId));
  });
};

export const fetchUserProfileCached = cache(
  async (currentUser: CurrentUser | null, slug: string) => {
    return await db.query.users.findFirst({
      columns: {
        _id: true,
        displayName: true,
        slug: true,
        oldSlugs: true,
        profileImageId: true,
        karma: true,
        createdAt: true,
        jobTitle: true,
        organization: true,
        careerStage: true,
        website: true,
        deleted: true,
        banned: true,
        linkedinProfileURL: true,
        facebookProfileURL: true,
        blueskyProfileURL: true,
        twitterProfileURL: true,
        githubProfileURL: true,
        postCount: true,
        commentCount: true,
        sequenceCount: true,
        tagRevisionCount: true,
        noindex: true,
        mapLocation: true,
        programParticipation: true,
        profileTagIds: true,
        reviewedByUserId: true,
      },
      extras: {
        biographyHtml: (usersTable) =>
          sql<string | null>`${usersTable}."biography"->>'html'`,
        howOthersCanHelpMeHtml: (usersTable) =>
          sql<string | null>`${usersTable}."howOthersCanHelpMe"->>'html'`,
        howICanHelpOthersHtml: (usersTable) =>
          sql<string | null>`${usersTable}."howICanHelpOthers"->>'html'`,
      },
      where: {
        OR: [
          { slug },
          {
            RAW: (usersTable) =>
              sql<boolean>`${usersTable}."oldSlugs" @> ARRAY[${slug}]`,
          },
        ],
        ...(userIsAdminOrMod(currentUser)
          ? {}
          : {
              AND: [
                { deleted: false },
                {
                  OR: [
                    { banned: { isNull: true } },
                    { banned: { lt: new Date().toISOString() } },
                  ],
                },
              ],
            }),
      },
    });
  },
);
