import { arrayContains, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments } from "@/lib/schema";
import { nDaysAgo, nHoursAgo } from "@/lib/timeUtils";
import { postStatuses } from "../posts/postLists";
import {
  isAnyInArray,
  isNotTrue,
  RelationalProjection,
} from "@/lib/utils/queryHelpers";
import fromPairs from "lodash/fromPairs";
import sortBy from "lodash/sortBy";
import { userDefaultProjection } from "../users/userQueries";

export type CommentRelationalProjection = RelationalProjection<
  typeof db.query.comments
>;

export type CommentsList = Awaited<ReturnType<typeof fetchCommentsList>>[number];

type CommentsFilter = NonNullable<
  Parameters<typeof db.query.comments.findMany>[0]
>["where"];

type CommentsOrderBy = NonNullable<
  Parameters<typeof db.query.comments.findMany>[0]
>["orderBy"];

export const viewableCommentFilter = {
  rejected: isNotTrue,
  debateResponse: isNotTrue,
  authorIsUnreviewed: isNotTrue,
  draft: isNotTrue,
} as const;

export const commentListProjection = (currentUserId: string | null) =>
  ({
    columns: {
      _id: true,
      postedAt: true,
      baseScore: true,
      voteCount: true,
      parentCommentId: true,
      topLevelCommentId: true,
      descendentCount: true,
      deleted: true,
    },
    extras: {
      html: sql<string>`contents->>'html'`.as("html"),
    },
    with: {
      user: {
        ...userDefaultProjection,
        where: {
          deleted: isNotTrue,
        },
      },
      ...(currentUserId
        ? {
            votes: {
              columns: {
                voteType: true,
                extendedVoteType: true,
                power: true,
              },
              where: {
                userId: currentUserId,
                cancelled: false,
              },
              limit: 1,
            },
          }
        : {}),
    },
  }) as const satisfies CommentRelationalProjection;

const fetchCommentsList = ({
  currentUserId,
  where,
  orderBy,
  offset,
  limit,
}: {
  currentUserId: string | null;
  where?: CommentsFilter;
  orderBy?: CommentsOrderBy;
  offset?: number;
  limit?: number;
}) => {
  return db.query.comments.findMany({
    ...commentListProjection(currentUserId),
    where: {
      ...viewableCommentFilter,
      ...where,
    },
    orderBy,
    offset,
    limit,
  });
};

export const fetchCommentsListItem = async ({
  commentId,
  currentUserId,
}: {
  commentId: string;
  currentUserId: string | null;
}) => {
  const result = await fetchCommentsList({
    currentUserId,
    where: { _id: commentId },
    limit: 1,
  });
  return result[0] ?? null;
};

export const fetchCommmentsForPost = ({
  postId,
  currentUserId,
}: {
  postId: string;
  currentUserId: string | null;
}) =>
  fetchCommentsList({
    currentUserId,
    where: { postId },
  });

export const fetchFrontpageQuickTakes = ({
  currentUserId,
  includeCommunity,
  relevantTagId,
  offset,
  limit = 5,
}: {
  currentUserId: string | null;
  includeCommunity?: boolean;
  relevantTagId?: string;
  offset?: number;
  limit?: number;
}) => {
  const fiveDaysAgo = nDaysAgo(5).toISOString();
  const twoHoursAgo = nHoursAgo(2).toISOString();
  const communityFilter =
    includeCommunity && process.env.COMMUNITY_TAG_ID
      ? arrayContains(comments.relevantTagIds, [process.env.COMMUNITY_TAG_ID])
      : undefined;
  const tagFilter = relevantTagId
    ? arrayContains(comments.relevantTagIds, [relevantTagId])
    : undefined;
  return fetchCommentsList({
    currentUserId,
    where: {
      shortform: true,
      shortformFrontpage: true,
      deleted: isNotTrue,
      parentCommentId: { isNull: true },
      createdAt: { gt: fiveDaysAgo },
      ...communityFilter,
      ...tagFilter,
      AND: [
        {
          OR: [
            { authorIsUnreviewed: isNotTrue },
            { userId: currentUserId ? { eq: currentUserId } : undefined },
          ],
        },
        // Quick takes older than 2 hours must have at least 1 karma, quick
        // takes younger than 2 hours must have at least -5 karma
        {
          OR: [
            {
              baseScore: { gte: 1 },
              createdAt: { lt: twoHoursAgo },
            },
            {
              baseScore: { gte: -5 },
              createdAt: { gte: twoHoursAgo },
            },
          ],
        },
      ],
    },
    orderBy: {
      score: "desc",
      lastSubthreadActivity: "desc",
      postedAt: "desc",
      _id: "desc",
    },
    offset,
    limit,
  });
};

type PopularCommentsConfig = {
  currentUserId: string | null;
  offset?: number;
  limit?: number;
  minScore?: number;
  // The factor to divide age by for the recency bonus
  recencyFactor?: number;
  // The minimum age that a post will be considered as having, to avoid
  // over selecting brand new comments - defaults to 2 hours
  recencyBias?: number;
};

/**
 * Fetch a list of popular comments for the homepage. Note that this is quite
 * slow so we actually use a cached version of this below.
 */
const fetchPopularCommentsUncached = async ({
  currentUserId,
  minScore = 12,
  offset = 0,
  limit = 3,
  recencyFactor = 250000,
  recencyBias = 60 * 60 * 2,
}: PopularCommentsConfig): Promise<CommentsList[]> => {
  const communityTopicId = process.env.COMMUNITY_TAG_ID;
  const popularComments = await db.execute(sql`
    SELECT c._id
    FROM (
      SELECT DISTINCT ON ("postId") "_id"
      FROM "Comments"
      WHERE
        CURRENT_TIMESTAMP - "postedAt" < '1 week'::INTERVAL
        AND "shortform" IS NOT TRUE
        AND "baseScore" >= ${minScore}
        AND "retracted" IS NOT TRUE
        AND "deleted" IS NOT TRUE
        AND "deletedPublic" IS NOT TRUE
        AND "needsReview" IS NOT TRUE
      ORDER BY "postId", "baseScore" DESC
    ) q
    JOIN "Comments" c ON c."_id" = q."_id"
    JOIN "Posts" p ON c."postId" = p."_id"
    WHERE
      p."hideFromPopularComments" IS NOT TRUE
      AND p."frontpageDate" IS NOT NULL
      AND p."status" = ${postStatuses.STATUS_APPROVED}
      AND p."draft" IS FALSE
      AND p."deletedDraft" IS FALSE
      AND p."isFuture" IS FALSE
      AND p."unlisted" IS FALSE
      AND p."shortform" IS FALSE
      AND p."authorIsUnreviewed" IS FALSE
      AND p."hiddenRelatedQuestion" IS FALSE
      AND p."isEvent" IS FALSE
      AND p."postedAt" IS NOT NULL
      AND COALESCE((p."tagRelevance"->${communityTopicId})::INTEGER, 0) < 1
    ORDER BY
      c."baseScore"
      * EXP(
          (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP - c."postedAt") + ${recencyBias})
            / -${recencyFactor}::DOUBLE PRECISION
        ) DESC
    OFFSET ${offset}
    LIMIT ${limit}
  `);
  const popularCommentIds = popularComments.rows.map(({ _id }) => _id);
  const result = await fetchCommentsList({
    currentUserId,
    where: {
      RAW: (commentsTable) => isAnyInArray(commentsTable._id, popularCommentIds),
    },
  });
  const order = fromPairs(popularCommentIds.map((id, i) => [id, i]));
  return sortBy(result, (c) => order[c._id] ?? Number.MAX_SAFE_INTEGER);
};

const popularCommentsCache = {
  comments: [] as CommentsList[],
  lastFetchedAt: new Date(0).getTime(),
  maxAgeSeconds: 60,
};

export const fetchPopularComments = async (config: PopularCommentsConfig) => {
  const now = new Date().getTime();
  const maxAgeMs = popularCommentsCache.maxAgeSeconds * 1000;
  if (now - maxAgeMs > popularCommentsCache.lastFetchedAt) {
    popularCommentsCache.comments = await fetchPopularCommentsUncached(config);
    popularCommentsCache.lastFetchedAt = now;
  }
  return popularCommentsCache.comments;
};
