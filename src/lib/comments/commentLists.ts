import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { User } from "../schema";
import type { AllPostsSortedBy } from "../posts/allPostsSettings";
import { userIsAdminOrMod, UserPermissions } from "../users/userHelpers";
import { nDaysAgo, nHoursAgo } from "@/lib/timeUtils";
import { userBaseProjection } from "../users/userQueries";
import { commentTagsProjection } from "../tags/tagQueries";
import { postStatuses } from "../posts/postsHelpers";
import { isNotTrue, RelationalProjection } from "@/lib/utils/queryHelpers";
import { reactorsSelector } from "../votes/reactorsSelector";
import { fetchCommentDescendants } from "./commentQueries";
import fromPairs from "lodash/fromPairs";
import orderBy from "lodash/orderBy";
import sortBy from "lodash/sortBy";

export type CommentRelationalProjection = RelationalProjection<
  typeof db.query.comments
>;

export type CommentFromProjection<TConfig extends CommentRelationalProjection> =
  Awaited<ReturnType<typeof db.query.comments.findMany<TConfig>>>[number];

export type CommentListItem = Awaited<ReturnType<typeof fetchCommentsList>>[number];

type CommentsFilter = NonNullable<
  Parameters<typeof db.query.comments.findMany>[0]
>["where"];

type CommentsOrderBy = NonNullable<
  Parameters<typeof db.query.comments.findMany>[0]
>["orderBy"];

export const viewableCommentFilter = (currentUserId: string | null) => ({
  OR: [
    ...(currentUserId ? [{ userId: currentUserId }] : []),
    {
      rejected: false,
      deleted: false,
      debateResponse: isNotTrue,
      authorIsUnreviewed: false,
      draft: false,
    },
  ],
});

export const commentListProjection = (currentUser: UserPermissions | null) =>
  ({
    columns: {
      _id: true,
      postedAt: true,
      lastEditedAt: true,
      lastSubthreadActivity: true,
      score: true,
      baseScore: true,
      voteCount: true,
      extendedScore: true,
      parentCommentId: true,
      topLevelCommentId: true,
      descendentCount: true,
      directChildrenCount: true,
      draft: true,
      deleted: true,
      deletedDate: true,
      deletedReason: true,
      tagCommentType: true,
      isPinnedOnProfile: true,
      shortform: true,
      shortformFrontpage: true,
      moderatorHat: true,
      promoted: true,
      forumEventMetadata: true,
      authorIsUnreviewed: true,
      repliesBlockedUntil: true,
      retracted: true,
      rejected: true,
    },
    extras: {
      html: sql<string>`contents->>'html'`.as("html"),
      reactors: reactorsSelector("Comments"),
      tags: commentTagsProjection,
    },
    with: {
      ...(userIsAdminOrMod(currentUser)
        ? {
            contentsRevision: {
              columns: {
                _id: true,
                pangramAiScore: true,
                pangramCheckedAt: true,
                pangramStatus: true,
                pangramRawResponse: true,
              },
            },
          }
        : {}),
      user: {
        ...userBaseProjection,
        where: {
          deleted: isNotTrue,
        },
      },
      promotedBy: {
        columns: {
          displayName: true,
        },
      },
      deletedBy: {
        columns: {
          _id: true,
          displayName: true,
        },
      },
      forumEvent: {
        columns: {
          _id: true,
          isGlobal: true,
          pollAgreeWording: true,
          pollDisagreeWording: true,
        },
        with: {
          pollQuestion: {
            columns: {
              html: true,
            },
          },
        },
      },
      post: {
        columns: {
          _id: true,
          slug: true,
          title: true,
          userId: true,
          frontpageDate: true,
          coauthorUserIds: true,
          postedAt: true,
        },
        with: {
          ...(currentUser
            ? {
                readStatus: {
                  columns: {
                    lastUpdated: true,
                  },
                  where: {
                    userId: currentUser._id,
                  },
                },
              }
            : {}),
        },
      },
      tag: {
        columns: {
          _id: true,
          slug: true,
        },
      },
      awards: {
        columns: {
          _id: true,
          userId: true,
          count: true,
        },
      },
      ...(currentUser
        ? {
            bookmarks: {
              columns: {
                active: true,
              },
              where: {
                userId: currentUser._id,
              },
            },
            votes: {
              columns: {
                voteType: true,
                extendedVoteType: true,
                power: true,
              },
              where: {
                userId: currentUser._id,
              },
              orderBy: {
                votedAt: "desc",
              },
              limit: 1,
            },
          }
        : {}),
    },
  }) as const satisfies CommentRelationalProjection;

// Merges the base comment filters (viewability + the moderator-aware post
// filter) with a caller-supplied `where`. Shared between the list query and
// count queries so they always filter on exactly the same set of comments.
const commentsListWhere = (
  currentUser: UserPermissions | null,
  where?: CommentsFilter,
): CommentsFilter => {
  const currentUserId = currentUser?._id ?? null;
  const currentUserIsModerator =
    currentUser?.isAdmin ||
    currentUser?.groups?.includes("sunshineRegiment") ||
    false;
  return {
    ...viewableCommentFilter(currentUserId),
    post: currentUserIsModerator
      ? undefined
      : {
          OR: [
            ...(currentUserId ? [{ userId: currentUserId }] : []),
            {
              draft: isNotTrue,
              deletedDraft: isNotTrue,
            },
          ],
        },
    ...where,
  };
};

const fetchCommentsList = ({
  currentUser,
  where,
  orderBy,
  offset,
  limit,
}: {
  currentUser: UserPermissions | null;
  where?: CommentsFilter;
  orderBy?: CommentsOrderBy;
  offset?: number;
  limit?: number;
}) => {
  return db.query.comments.findMany({
    ...commentListProjection(currentUser),
    where: commentsListWhere(currentUser, where),
    orderBy,
    offset,
    limit,
  });
};

export const fetchCommentsListItem = async ({
  currentUser,
  commentId,
}: {
  currentUser: UserPermissions | null;
  commentId: string;
}): Promise<CommentListItem | null> => {
  const result = await fetchCommentsList({
    currentUser,
    where: { _id: commentId },
    limit: 1,
  });
  return result[0] ?? null;
};

export const fetchCommmentsForPost = ({
  currentUser,
  postId,
}: {
  currentUser: UserPermissions | null;
  postId: string;
}) =>
  fetchCommentsList({
    currentUser,
    where: { postId },
  });

export const fetchCommentsForForumEvent = ({
  currentUser,
  forumEventId,
}: {
  currentUser: UserPermissions | null;
  forumEventId: string;
}) =>
  fetchCommentsList({
    currentUser,
    where: { forumEventId },
  });

const frontpageQuickTakesWhere = ({
  currentUser,
  includeCommunity,
  maxAgeDays = 7,
}: {
  currentUser: UserPermissions | null;
  includeCommunity?: boolean;
  maxAgeDays?: number;
}): CommentsFilter => {
  const fiveDaysAgo = nDaysAgo(maxAgeDays).toISOString();
  const twoHoursAgo = nHoursAgo(2).toISOString();
  return {
    shortform: true,
    shortformFrontpage: true,
    deleted: false,
    parentCommentId: { isNull: true },
    createdAt: { gt: fiveDaysAgo },
    ...(!includeCommunity && process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID
      ? {
          NOT: {
            relevantTagIds: {
              arrayContains: [process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID],
            },
          },
        }
      : null),
    AND: [
      {
        OR: [
          { authorIsUnreviewed: isNotTrue },
          { userId: currentUser?._id ? { eq: currentUser?._id } : undefined },
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
  };
};

export const fetchFrontpageQuickTakes = ({
  currentUser,
  includeCommunity,
  maxAgeDays,
  offset,
  limit = 5,
}: {
  currentUser: UserPermissions | null;
  includeCommunity?: boolean;
  maxAgeDays?: number;
  offset?: number;
  limit?: number;
}) => {
  return fetchCommentsList({
    currentUser,
    where: frontpageQuickTakesWhere({ currentUser, includeCommunity, maxAgeDays }),
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

export const countFrontpageQuickTakes = async ({
  currentUser,
  includeCommunity,
}: {
  currentUser: UserPermissions | null;
  includeCommunity?: boolean;
}): Promise<number> => {
  const result = await db.query.comments.findFirst({
    columns: {},
    extras: { count: sql<number>`COUNT(*)` },
    where: commentsListWhere(
      currentUser,
      frontpageQuickTakesWhere({ currentUser, includeCommunity }),
    ),
  });
  return Number(result?.count ?? 0);
};

export const fetchNewComments = async (
  currentUser: UserPermissions | null,
  postId: string,
  limit: number,
) => {
  return await fetchCommentsList({
    currentUser,
    where: {
      postId,
    },
    orderBy: { postedAt: "desc" },
    limit,
  });
};

type PopularCommentsConfig = {
  currentUser: Pick<User, "_id" | "isAdmin" | "groups" | "banned"> | null;
  offset?: number;
  limit?: number;
  minScore?: number;
  // The factor to divide age by for the recency bonus
  recencyFactor?: number;
  // The minimum age that a post will be considered as having, to avoid
  // over selecting brand new comments - defaults to 2 hours
  recencyBias?: number;
};

export const fetchPopularComments = async ({
  currentUser,
  minScore = 10,
  offset = 0,
  limit = 3,
  recencyFactor = 250000,
  recencyBias = 60 * 60 * 2,
}: PopularCommentsConfig): Promise<CommentListItem[]> => {
  const communityTopicId = process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID;
  const popularComments = await db.execute<{ _id: string }>(sql`
    SELECT c._id
    FROM (
      SELECT DISTINCT ON ("postId") "_id"
      FROM "Comments"
      WHERE
        CURRENT_TIMESTAMP - "postedAt" < '2 weeks'::INTERVAL
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
      AND p."draft" IS NOT TRUE
      AND p."deletedDraft" IS NOT TRUE
      AND p."isFuture" IS NOT TRUE
      AND p."unlisted" IS NOT TRUE
      AND p."shortform" IS NOT TRUE
      AND p."authorIsUnreviewed" IS NOT TRUE
      AND p."hiddenRelatedQuestion" IS NOT TRUE
      AND p."isEvent" IS NOT TRUE
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
    currentUser,
    where: {
      _id: { in: popularCommentIds },
    },
  });
  const order = fromPairs(popularCommentIds.map((id, i) => [id, i]));
  return sortBy(result, (c) => order[c._id] ?? Number.MAX_SAFE_INTEGER);
};

export const fetchCommentReplies = async ({
  currentUser,
  commentId,
}: {
  currentUser: UserPermissions | null;
  commentId: string;
}) => {
  const descendants = await fetchCommentDescendants(db, commentId);
  return await fetchCommentsList({
    currentUser,
    where: {
      _id: { in: descendants.map(({ _id }) => _id) },
    },
  });
};

/**
 * This is really inefficient because it turns out its complicated to merge
 * these 2 lists with a limit whilst still supporting loading more. For now,
 * we just always refetch the entire list and replace instead of appending. The
 * ideal situation would be to fetch both in a single query with UNION, but the
 * queries are complicated enough that this is non-trivial.
 */
export const fetchFrontpagePopularCommentsAndQuickTakes = async ({
  currentUser,
  limit,
}: {
  currentUser: UserPermissions | null;
  limit: number;
}) => {
  const [popularComments, quickTakes] = await Promise.all([
    fetchPopularComments({ currentUser, limit }),
    fetchFrontpageQuickTakes({ currentUser, limit }),
  ]);
  return orderBy([...popularComments, ...quickTakes], ["score"], ["desc"]).slice(
    0,
    limit,
  );
};

export const fetchUserProfileComments = async ({
  currentUser,
  userId,
  limit = 10,
  offset = 0,
}: {
  currentUser: UserPermissions | null;
  userId: string;
  limit?: number;
  offset?: number;
}) => {
  return await fetchCommentsList({
    currentUser,
    where: {
      userId,
      draft: false,
      deletedPublic: false,
    },
    orderBy: {
      isPinnedOnProfile: "desc",
      postedAt: "desc",
    },
    limit,
    offset,
  });
};

export const fetchUserProfileDraftComments = async ({
  currentUser,
  userId,
  limit,
  offset,
}: {
  currentUser: UserPermissions;
  userId: string;
  limit?: number;
  offset?: number;
}) => {
  return await fetchCommentsList({
    currentUser,
    where: {
      userId,
      draft: true,
      deleted: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    limit,
    offset,
  });
};

const getAllPostsSort = (sortedBy: AllPostsSortedBy) => {
  switch (sortedBy) {
    case "new":
      return { postedAt: "desc", _id: "asc" } as const;
    case "old":
      return { postedAt: "asc", _id: "asc" } as const;
    default:
      return { baseScore: "desc", postedAt: "desc", _id: "asc" } as const;
  }
};

export const fetchAllPostsQuickTakes = async ({
  currentUser,
  frontpage,
  sortedBy,
  before = new Date(),
  after = new Date(0),
  limit,
  offset,
}: {
  currentUser: UserPermissions | null;
  frontpage?: boolean;
  sortedBy: AllPostsSortedBy;
  before?: Date;
  after?: Date;
  limit?: number;
  offset?: number;
}) => {
  return await fetchCommentsList({
    currentUser,
    where: {
      postedAt: {
        AND: [{ lt: before.toISOString() }, { gte: after.toISOString() }],
      },
      shortform: true,
      shortformFrontpage: frontpage ? true : undefined,
    },
    orderBy: getAllPostsSort(sortedBy),
    limit,
    offset,
  });
};
