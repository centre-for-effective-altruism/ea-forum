import { sql } from "drizzle-orm";
import keyBy from "lodash/keyBy";
import { db } from "@/lib/db";
import { createRawSqlArray } from "@/lib/utils/queryHelpers";
import {
  commentListProjection,
  viewableCommentFilter,
  type CommentsList,
} from "@/lib/comments/commentLists";
import { viewablePostFilter } from "@/lib/posts/postLists";
import type { User } from "@/lib/schema";
import { isNotTrue } from "@/lib/utils/queryHelpers";
import { userIsModOrAdmin } from "@/lib/users/userHelpers";
import { uniqueIds } from "./moderationTransforms";
import type {
  GloballyBannedUserRow,
  PostSummary,
  RateLimitRow,
  UserSummary,
} from "./moderationTypes";

export const fetchUsersByIds = async (
  ids: ReadonlyArray<string | null | undefined>,
  { includeDeleted = false }: { includeDeleted?: boolean } = {},
): Promise<Record<string, UserSummary>> => {
  const userIds = uniqueIds(ids);
  if (userIds.length === 0) {
    return {};
  }
  const users = await db.query.users.findMany({
    columns: {
      _id: true,
      slug: true,
      displayName: true,
      deleted: true,
    },
    where: {
      ...(includeDeleted ? {} : { deleted: isNotTrue }),
      OR: userIds.map((userId) => ({ _id: userId })),
    },
  });
  return keyBy(users, "_id");
};

export const fetchPostsByIds = async (
  ids: ReadonlyArray<string | null | undefined>,
): Promise<Record<string, PostSummary>> => {
  const postIds = uniqueIds(ids);
  if (postIds.length === 0) {
    return {};
  }
  const posts = await db.query.posts.findMany({
    columns: {
      _id: true,
      slug: true,
      title: true,
      isEvent: true,
      groupId: true,
    },
    where: {
      ...viewablePostFilter,
      OR: postIds.map((postId) => ({ _id: postId })),
    },
  });
  return keyBy(posts, "_id");
};

export const fetchModeratorComments = async ({
  currentUser,
  offset,
  limit,
}: {
  currentUser: Pick<User, "_id" | "isAdmin" | "groups" | "banned"> | null;
  offset: number;
  limit: number;
}): Promise<{ comments: CommentsList[]; count: number }> => {
  const currentUserId = currentUser?._id ?? null;
  const currentUserIsModerator = userIsModOrAdmin(currentUser);
  const publicPostVisibilityCondition = sql`(
    p."draft" = ${viewablePostFilter.draft}
    AND p."deletedDraft" = ${viewablePostFilter.deletedDraft}
    AND p."isFuture" = ${viewablePostFilter.isFuture}
    AND p."unlisted" = ${viewablePostFilter.unlisted}
    AND p."shortform" = ${viewablePostFilter.shortform}
    AND p."rejected" = ${viewablePostFilter.rejected}
    AND p."authorIsUnreviewed" = ${viewablePostFilter.authorIsUnreviewed}
    AND p."hiddenRelatedQuestion" = ${viewablePostFilter.hiddenRelatedQuestion}
    AND p."postedAt" IS NOT NULL
    AND p."status" = ${viewablePostFilter.status}
  )`;
  const countConditions = [
    sql`c."moderatorHat" = TRUE`,
    sql`c."draft" IS NOT TRUE`,
    sql`c."deleted" IS NOT TRUE`,
    currentUserId
      ? sql`(
          c."userId" = ${currentUserId}
          OR (
            c."rejected" IS NOT TRUE
            AND c."debateResponse" IS NOT TRUE
            AND c."authorIsUnreviewed" IS NOT TRUE
          )
        )`
      : sql`(
          c."rejected" IS NOT TRUE
          AND c."debateResponse" IS NOT TRUE
          AND c."authorIsUnreviewed" IS NOT TRUE
        )`,
    currentUserIsModerator
      ? null
      : currentUserId
        ? sql`(
            p."userId" = ${currentUserId}
            OR ${publicPostVisibilityCondition}
          )`
        : publicPostVisibilityCondition,
  ].filter((condition) => condition !== null);
  const comments = await db.query.comments.findMany({
    ...commentListProjection(currentUserId),
    where: {
      ...viewableCommentFilter(currentUserId),
      moderatorHat: true,
      draft: isNotTrue,
      deleted: isNotTrue,
      post: currentUserIsModerator
        ? undefined
        : {
            OR: [
              ...(currentUserId ? [{ userId: currentUserId }] : []),
              viewablePostFilter,
            ],
          },
    },
    orderBy: {
      postedAt: "desc",
    },
    offset,
    limit,
  });

  const countResult = await db.execute<{ count: number | string }>(
    sql`
      SELECT COUNT(*)::int as count
      FROM "Comments" c
      LEFT JOIN "Posts" p ON c."postId" = p."_id"
      WHERE ${sql.join(countConditions, sql` AND `)}
    `,
  );
  const count = Number(countResult.rows[0]?.count ?? 0);

  return { comments: comments as CommentsList[], count };
};

export const fetchDeletedComments = async ({
  offset,
  limit,
}: {
  offset: number;
  limit: number;
}) => {
  const comments = await db.query.comments.findMany({
    columns: {
      _id: true,
      postId: true,
      userId: true,
      deletedByUserId: true,
      deletedDate: true,
      deletedPublic: true,
      deletedReason: true,
    },
    with: {
      user: {
        columns: {
          _id: true,
          slug: true,
          displayName: true,
          deleted: true,
        },
      },
    },
    where: {
      deleted: true,
      deletedPublic: true,
    },
    orderBy: {
      deletedDate: "desc",
      createdAt: "desc",
    },
    offset,
    limit,
  });

  const countResult = await db.execute<{ count: number | string }>(
    sql`
      SELECT COUNT(*)::int as count
      FROM "Comments"
      WHERE deleted = TRUE AND "deletedPublic" = TRUE
    `,
  );
  const count = Number(countResult.rows[0]?.count ?? 0);

  return { comments, count };
};

export const fetchModeratorActions = async ({
  offset,
  limit,
}: {
  offset: number;
  limit: number;
}) => {
  const actions = await db.query.moderatorActions.findMany({
    columns: {
      _id: true,
      userId: true,
      type: true,
      endedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    offset,
    limit,
  });

  const countResult = await db.execute<{ count: number | string }>(
    sql`
      SELECT COUNT(*)::int as count
      FROM "ModeratorActions"
    `,
  );
  const count = Number(countResult.rows[0]?.count ?? 0);

  return { actions, count };
};

export const fetchAutoRateLimits = async ({
  offset,
  limit,
  showExpiredRateLimits,
  showNewUserRateLimits,
}: {
  offset: number;
  limit: number;
  showExpiredRateLimits: boolean;
  showNewUserRateLimits: boolean;
}) => {
  const latestEventsCte = sql`
    latest_events AS (
      SELECT DISTINCT ON (e."userId", e.properties->>'rateLimitType', e.properties->>'actionType')
        e."userId",
        e.name,
        e.properties,
        COALESCE((e.properties->>'triggeredAt')::timestamp, e."createdAt") as "triggeredAt"
      FROM "LWEvents" e
      WHERE e.name IN ('rateLimitActivated', 'rateLimitDeactivated')
      ORDER BY e."userId", e.properties->>'rateLimitType', e.properties->>'actionType', e."createdAt" DESC
    )
  `;

  const filteredLimitsWhere = showExpiredRateLimits
    ? sql`le.name IN ('rateLimitActivated', 'rateLimitDeactivated')`
    : sql`le.name = 'rateLimitActivated'`;

  const [activeRateLimitsResult, countResult] = await Promise.all([
    db.execute<RateLimitRow>(sql`
      WITH ${latestEventsCte},
      filtered_limits AS (
        SELECT
          le."userId",
          le.name,
          le.properties,
          le."triggeredAt"
        FROM latest_events le
        WHERE ${filteredLimitsWhere}
      ),
      users_with_limits AS (
        SELECT
          fl."userId",
          MAX(fl."triggeredAt") as "mostRecentActivation",
          json_agg(
            json_build_object(
              'actionType', fl.properties->>'actionType',
              'rateLimitType', fl.properties->>'rateLimitType',
              'rateLimitCategory', fl.properties->>'rateLimitCategory',
              'itemsPerTimeframe', (fl.properties->>'itemsPerTimeframe')::int,
              'timeframeLength', (fl.properties->>'timeframeLength')::int,
              'timeframeUnit', fl.properties->>'timeframeUnit',
              'rateLimitMessage', fl.properties->>'rateLimitMessage',
              'activatedAt', fl."triggeredAt"
            )
          ) as "rateLimits"
        FROM filtered_limits fl
        GROUP BY fl."userId"
      )
      SELECT
        uwl."userId",
        uwl."rateLimits" as "rateLimits",
        uwl."mostRecentActivation",
        u._id as "user__id",
        u."displayName" as "user_displayName",
        u.slug as "user_slug",
        u.deleted as "user_deleted",
        u."createdAt" as "user_createdAt",
        u.karma as "user_karma",
        u."postCount" as "user_postCount",
        u."commentCount" as "user_commentCount"
      FROM users_with_limits uwl
      LEFT JOIN "Users" u ON uwl."userId" = u._id
      ${
        showNewUserRateLimits
          ? sql``
          : sql`WHERE COALESCE(u."postCount", 0) + COALESCE(u."commentCount", 0) >= 5`
      }
      ORDER BY uwl."mostRecentActivation" DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute<{ count: number | string }>(sql`
      WITH ${latestEventsCte},
      filtered_limits AS (
        SELECT DISTINCT le."userId"
        FROM latest_events le
        WHERE ${filteredLimitsWhere}
      )
      SELECT COUNT(*)::int as count
      FROM filtered_limits fl
      ${
        showNewUserRateLimits
          ? sql``
          : sql`LEFT JOIN "Users" u ON fl."userId" = u._id
                WHERE COALESCE(u."postCount", 0) + COALESCE(u."commentCount", 0) >= 5`
      }
    `),
  ]);

  const count = Number(countResult.rows[0]?.count ?? 0);
  return { rows: activeRateLimitsResult.rows, count };
};

export const fetchGloballyBannedUsers = async ({
  offset,
  limit,
  showExpiredBans,
}: {
  offset: number;
  limit: number;
  showExpiredBans: boolean;
}): Promise<{ users: GloballyBannedUserRow[]; count: number }> => {
  const users = await db.query.users.findMany({
    columns: {
      _id: true,
      displayName: true,
      slug: true,
      deleted: true,
      karma: true,
      createdAt: true,
      postCount: true,
      commentCount: true,
      banned: true,
    },
    where: showExpiredBans
      ? { banned: { isNotNull: true } }
      : { banned: { gt: new Date().toISOString() } },
    orderBy: {
      karma: "desc",
    },
    offset,
    limit,
  });

  const countResult = await db.execute<{ count: number | string }>(
    sql`
      SELECT COUNT(*)::int as count
      FROM "Users"
      WHERE banned IS NOT NULL
        ${showExpiredBans ? sql`` : sql`AND banned > NOW()`}
    `,
  );
  const count = Number(countResult.rows[0]?.count ?? 0);

  return { users: users as GloballyBannedUserRow[], count };
};

export const fetchManualRateLimits = async ({
  offset,
  limit,
}: {
  offset: number;
  limit: number;
}) => {
  const manualRateLimitTypes = [
    "rateLimitOnePerDay",
    "rateLimitOnePerThreeDays",
    "rateLimitOnePerWeek",
    "rateLimitOnePerFortnight",
    "rateLimitOnePerMonth",
    "rateLimitThreeCommentsPerPost",
  ];

  const actions = await db.query.moderatorActions.findMany({
    columns: {
      _id: true,
      userId: true,
      type: true,
      endedAt: true,
    },
    where: {
      RAW: (moderatorActions, { sql }) => sql`
        ${moderatorActions.type} = ANY(${createRawSqlArray(manualRateLimitTypes)}) AND
        (${moderatorActions.endedAt} IS NULL OR ${moderatorActions.endedAt} > NOW())
      `,
    },
    orderBy: {
      endedAt: "asc",
      createdAt: "desc",
    },
    offset,
    limit,
  });

  const countResult = await db.execute<{ count: number | string }>(sql`
    SELECT COUNT(*)::int as count
    FROM "ModeratorActions" ma
    WHERE ma.type = ANY(${createRawSqlArray(manualRateLimitTypes)})
      AND (ma."endedAt" IS NULL OR ma."endedAt" > NOW())
  `);
  const count = Number(countResult.rows[0]?.count ?? 0);

  return { actions, count };
};
