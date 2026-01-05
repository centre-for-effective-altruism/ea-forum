import { sql } from "drizzle-orm";
import { db, isNotTrue, posts } from "@/lib/schema";

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

const viewablePostFilter = {
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

const createCommunityFilter = (community: boolean) => {
  const tagId = process.env.COMMUNITY_TAG_ID;
  if (!tagId) {
    console.warn("Community tag ID is not configured");
    return {};
  }
  if (community) {
    return {
      RAW: (postsTable: typeof posts) =>
        sql`(${postsTable.tagRelevance} ->> ${tagId})::FLOAT >= 1`,
    };
  }
  return {
    RAW: (postsTable: typeof posts) => sql`
      NOT (${postsTable.tagRelevance} ? ${tagId})
      OR (${postsTable.tagRelevance} ->> ${tagId})::FLOAT < 1
    `,
  };
};

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

export const fetchFrontpagePostsList = ({
  limit,
  community,
}: {
  limit: number;
  community: boolean;
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
    },
    where: {
      ...viewablePostFilter,
      ...createCommunityFilter(community),
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
