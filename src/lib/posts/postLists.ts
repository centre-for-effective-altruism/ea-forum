import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { isNotTrue } from "@/lib/utils/queryHelpers";

const SCORE_BIAS = 2;
const TIME_DECAY_FACTOR = 0.8;
const CUTOFF_DAYS = 21;
const EPOCH_ISO_DATE = "1970-01-01 00:00:00";

export const postStatuses = {
  STATUS_PENDING: 1, // Unused
  STATUS_APPROVED: 2,
  STATUS_REJECTED: 3,
  STATUS_SPAM: 4,
  STATUS_DELETED: 5,
};

export const viewablePostFilter = {
  draft: isNotTrue,
  deletedDraft: isNotTrue,
  isFuture: isNotTrue,
  unlisted: isNotTrue,
  shortform: isNotTrue,
  rejected: isNotTrue,
  authorIsUnreviewed: isNotTrue,
  hiddenRelatedQuestion: isNotTrue,
  postedAt: { isNotNull: true },
  status: postStatuses.STATUS_APPROVED,
} as const;

/** Create a filter to return _only_ posts with a particular tag */
const onlyTagFilter = (tagId: string) => (postsTable: typeof posts) =>
  sql`(${postsTable.tagRelevance} ->> ${tagId})::FLOAT >= 1`;

/** Create a filter to exclude posts with a particular tag */
export const excludeTagFilter = (tagId: string) => (postsTable: typeof posts) =>
  sql`COALESCE((${postsTable.tagRelevance}->>${tagId})::FLOAT, 0) < 1`;

const getFrontpageCutoffDate = () =>
  new Date(new Date().getTime() - CUTOFF_DAYS * 24 * 60 * 60 * 1000);

/**
 * New and upvoted sorting: Calculate score from karma with bonuses for
 * frontpage/curated posts, then divide by a time decay factor.
 */
const magicSort = (postsTable: typeof posts) => sql`
  ${postsTable}."sticky" DESC,
  ${postsTable}."stickyPriority" DESC,
  (
    ${postsTable}."baseScore"
      + (CASE WHEN ${postsTable}."frontpageDate" IS NOT NULL THEN 10 ELSE 0 END)
      + (CASE WHEN ${postsTable}."curatedDate" IS NOT NULL THEN 10 ELSE 0 END)
  ) / POW(
    EXTRACT(EPOCH FROM NOW() - ${postsTable}."postedAt") / 3600000 + ${SCORE_BIAS},
    ${TIME_DECAY_FACTOR}
  ) DESC,
  ${postsTable}."_id" DESC
`;

export type PostsFilter = NonNullable<
  Parameters<typeof db.query.posts.findMany>[0]
>["where"];

type PostsOrderBy = NonNullable<
  Parameters<typeof db.query.posts.findMany>[0]
>["orderBy"];

const fetchPostsList = ({
  currentUserId,
  where,
  orderBy,
  limit,
}: {
  currentUserId: string | null;
  where?: PostsFilter;
  orderBy?: PostsOrderBy;
  limit?: number;
}) => {
  return db.query.posts.findMany({
    columns: {
      _id: true,
      slug: true,
      title: true,
      baseScore: true,
      voteCount: true,
      commentCount: true,
      postedAt: true,
      curatedDate: true,
      isEvent: true,
      groupId: true,
      sticky: true,
      eventImageId: true,
      socialPreview: true,
      socialPreviewImageAutoUrl: true,
      readTimeMinutesOverride: true,
    },
    with: {
      user: {
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
        },
        extras: {
          biography: (users, { sql }) => sql`${users}.biography->>'html'`,
        },
      },
      contents: {
        columns: {
          wordCount: true,
        },
        extras: {
          htmlHighlight: (revisions, { sql }) =>
            sql`SUBSTRING(${revisions}."html", 1, 200)`,
        },
      },
      readStatus: currentUserId
        ? {
            columns: {
              isRead: true,
            },
            where: {
              userId: currentUserId,
            },
          }
        : undefined,
    },
    where: {
      ...viewablePostFilter,
      ...where,
    },
    orderBy,
    limit,
  });
};

export const fetchFrontpagePostsList = ({
  currentUserId,
  limit,
  onlyTagId,
  excludeTagId,
}: {
  currentUserId: string | null;
  limit: number;
  onlyTagId?: string;
  excludeTagId?: string;
}) => {
  return fetchPostsList({
    currentUserId,
    where: {
      ...(onlyTagId ? { RAW: onlyTagFilter(onlyTagId) } : null),
      ...(excludeTagId ? { RAW: excludeTagFilter(excludeTagId) } : null),
      isEvent: isNotTrue,
      sticky: isNotTrue,
      groupId: { isNull: true },
      frontpageDate: { gt: EPOCH_ISO_DATE },
      postedAt: { gt: getFrontpageCutoffDate().toISOString() },
    },
    orderBy: magicSort,
    limit,
  });
};

export type PostListItem = Awaited<
  ReturnType<typeof fetchFrontpagePostsList>
>[number];

export const fetchSidebarOpportunities = (limit: number) => {
  const tagId = process.env.OPPORTUNITIES_TAG_ID;
  if (!tagId) {
    console.warn("Opportunities tag ID is not configured");
    return Promise.resolve([]);
  }
  return db.query.posts.findMany({
    columns: {
      _id: true,
      slug: true,
      title: true,
      postedAt: true,
      isEvent: true,
      groupId: true,
    },
    where: {
      ...viewablePostFilter,
      isEvent: isNotTrue,
      sticky: isNotTrue,
      groupId: { isNull: true },
      frontpageDate: { gt: EPOCH_ISO_DATE },
      postedAt: { gt: getFrontpageCutoffDate().toISOString() },
      RAW: (postsTable: typeof posts) =>
        sql`(${postsTable.tagRelevance} ->> ${tagId})::FLOAT >= 1`,
    },
    orderBy: magicSort,
    limit,
  });
};

export type SidebarOpportunityItem = Awaited<
  ReturnType<typeof fetchSidebarOpportunities>
>[number];

export const fetchSidebarEvents = (limit: number) => {
  return db.query.posts.findMany({
    columns: {
      _id: true,
      slug: true,
      title: true,
      startTime: true,
      onlineEvent: true,
      googleLocation: true,
      isEvent: true,
      groupId: true,
    },
    where: {
      ...viewablePostFilter,
      isEvent: true,
      startTime: { gt: new Date().toISOString() },
    },
    orderBy: {
      startTime: "asc",
      baseScore: "desc",
      _id: "desc",
    },
    limit,
  });
};

export type SidebarEventItem = Awaited<
  ReturnType<typeof fetchSidebarEvents>
>[number];

export const fetchMoreFromAuthorPostsList = async ({
  currentUserId,
  postId,
  minScore = 30,
  limit,
}: {
  currentUserId: string | null;
  postId: string;
  minScore?: number;
  limit: number;
}) => {
  // TODO: Can we do this a single drizzle query instead of fetching the post?
  const post = await db.query.posts.findFirst({
    columns: {
      userId: true,
    },
    where: {
      _id: postId,
    },
  });
  if (!post?.userId) {
    return [];
  }
  return fetchPostsList({
    currentUserId,
    where: {
      _id: { ne: postId },
      groupId: { isNull: true },
      isEvent: isNotTrue,
      baseScore: { gte: minScore },
      disableRecommendation: isNotTrue,
      user: {
        _id: post.userId,
        deleted: false,
      },
    },
    orderBy: {
      score: "desc",
    },
    limit,
  });
};

export const fetchCuratedAndPopularPostsList = async ({
  currentUserId,
  limit,
}: {
  currentUserId: string | null;
  limit: number;
}) => {
  const [curated, popular] = await Promise.all([
    fetchPostsList({
      currentUserId,
      where: {
        RAW: (postsTable) =>
          sql`NOW() - ${postsTable.curatedDate} < '7 days'::INTERVAL`,
        disableRecommendation: isNotTrue,
        readStatus: currentUserId ? { isRead: isNotTrue } : undefined,
      },
      orderBy: {
        curatedDate: "desc",
      },
      limit,
    }),
    fetchPostsList({
      currentUserId,
      where: {
        RAW: (postsTable) => sql`
          NOW() - ${postsTable.frontpageDate} < '7 days'::INTERVAL AND
          ${excludeTagFilter(process.env.COMMUNITY_TAG_ID)(postsTable)}
        `,
        curatedDate: { isNull: true },
        groupId: { isNull: true },
        disableRecommendation: isNotTrue,
        readStatus: currentUserId ? { isRead: isNotTrue } : undefined,
        user: {
          deleted: isNotTrue,
        },
      },
      orderBy: {
        baseScore: "desc",
      },
      limit,
    }),
  ]);
  return [...curated, ...popular].slice(0, limit);
};

export const fetchRecentOpportunitiesPostsList = async ({
  currentUserId,
  limit,
}: {
  currentUserId: string | null;
  limit: number;
}) => {
  // TODO: This logic for these recommendations in ForumMagnum is much more
  // complicated - this will be for now though
  return fetchPostsList({
    currentUserId,
    where: {
      RAW: onlyTagFilter(process.env.OPPORTUNITIES_TAG_ID),
    },
    orderBy: magicSort,
    limit,
  });
};
