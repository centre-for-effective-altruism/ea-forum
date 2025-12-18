import { sql } from "drizzle-orm";
import { db, posts } from "@/lib/schema";

const SCORE_BIAS = 2;
const TIME_DECAY_FACTOR = 0.8;
const CUTOFF_DAYS = 21;

export const postStatuses = {
  STATUS_PENDING: 1, // Unused
  STATUS_APPROVED: 2,
  STATUS_REJECTED: 3,
  STATUS_SPAM: 4,
  STATUS_DELETED: 5,
};

const viewablePostFilter = {
  draft: { ne: true },
  deletedDraft: { ne: true },
  isFuture: { ne: true },
  unlisted: { ne: true },
  shortform: { ne: true },
  rejected: { ne: true },
  authorIsUnreviewed: { ne: true },
  hiddenRelatedQuestion: { ne: true },
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
        sql`(${postsTable.tagRelevance} ->> ${tagId})::float >= 1`,
    };
  }
  return {
    RAW: (postsTable: typeof posts) => sql`
      NOT (${postsTable.tagRelevance} ? ${tagId})
      OR (${postsTable.tagRelevance} ->> ${tagId})::float < 1
    `,
  };
};

export const fetchFrontpagePostsList = ({
  limit,
  community,
}: {
  limit: number;
  community: boolean;
}) => {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - CUTOFF_DAYS * 24 * 60 * 60 * 1000);
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
      isEvent: { ne: true },
      sticky: { ne: true },
      groupId: { isNull: true },
      frontpageDate: { gt: "1970-01-01 00:00:00" },
      postedAt: { gt: cutoffDate.toISOString() },
    },
    // New and upvoted sorting: Calculate score from karma with bonuses for
    // frontpage/curated posts, then divide by a time decay factor.
    orderBy: (posts, { sql }) => sql`
      ${posts}."sticky" DESC,
      ${posts}."stickyPriority" DESC,
      (
        ${posts}."baseScore"
          + (CASE WHEN ${posts}."frontpageDate" IS NOT NULL THEN 10 ELSE 0 END)
          + (CASE WHEN ${posts}."curatedDate" IS NOT NULL THEN 10 ELSE 0 END)
      ) / POW(
        EXTRACT(EPOCH FROM NOW() - ${posts}."postedAt") / 3600000 + ${SCORE_BIAS},
        ${TIME_DECAY_FACTOR}
      ) DESC,
      ${posts}."_id" DESC
    `,
    limit,
  });
};

export type PostListItem = Awaited<
  ReturnType<typeof fetchFrontpagePostsList>
>[number];
