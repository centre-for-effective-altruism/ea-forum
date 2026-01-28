import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { postStatuses, type PostsListView } from "./postsHelpers";
import { userBaseProjection } from "../users/userQueries";
import { postTagsProjection } from "../tags/tagQueries";
import {
  htmlSubstring,
  isNotTrue,
  RelationalFilter,
  RelationalOrderBy,
  RelationalProjection,
} from "@/lib/utils/queryHelpers";
import {
  currentUserIsSharedSelector,
  currentUserUsedLinkKeySelector,
  currentUserSuggestedCurationSelector,
} from "./postQueries";

const SCORE_BIAS = 2;
const TIME_DECAY_FACTOR = 0.8;
const CUTOFF_DAYS = 21;
const EPOCH_ISO_DATE = "1970-01-01 00:00:00";

// TODO: This should be a function that takes the current user and does permission
// checks
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

export type PostRelationalProjection = RelationalProjection<typeof db.query.posts>;

export type PostFromProjection<TConfig extends PostRelationalProjection> = Awaited<
  ReturnType<typeof db.query.posts.findMany<TConfig>>
>[number];

export type PostsFilter = RelationalFilter<typeof db.query.posts>;

type PostsOrderBy = RelationalOrderBy<typeof db.query.posts>;

export const postsListProjection = (
  currentUserId: string | null,
  options?: {
    highlightLength?: number;
  },
) =>
  ({
    columns: {
      _id: true,
      slug: true,
      title: true,
      url: true,
      baseScore: true,
      voteCount: true,
      commentCount: true,
      postedAt: true,
      curatedDate: true,
      frontpageDate: true,
      question: true,
      isEvent: true,
      groupId: true,
      sticky: true,
      eventImageId: true,
      socialPreview: true,
      socialPreviewImageAutoUrl: true,
      readTimeMinutesOverride: true,
      collabEditorDialogue: true,
      disableRecommendation: true,
      authorIsUnreviewed: true,
      lastCommentedAt: true,
      sharingSettings: true,
      shortform: true,
    },
    extras: {
      customHtmlHighlight: (posts, { sql }) =>
        htmlSubstring(
          sql`${posts}."customHighlight"->>'html'`,
          options?.highlightLength || 350,
        ),
      tags: postTagsProjection,
      ...(currentUserId
        ? {
            currentUserIsShared: currentUserIsSharedSelector(currentUserId),
            currentUserUsedLinkKey: currentUserUsedLinkKeySelector(currentUserId),
            currentUserSuggestedCuration:
              currentUserSuggestedCurationSelector(currentUserId),
          }
        : null),
    },
    with: {
      user: userBaseProjection,
      contents: {
        columns: {
          wordCount: true,
        },
        extras: {
          htmlHighlight: (revisions, { sql }) =>
            htmlSubstring(sql`${revisions}."html"`, options?.highlightLength || 350),
        },
      },
      group: {
        columns: {
          _id: true,
          organizerIds: true,
        },
      },
      ...(currentUserId
        ? {
            bookmarks: {
              columns: {
                active: true,
              },
              where: {
                userId: currentUserId,
              },
            },
            readStatus: {
              columns: {
                isRead: true,
                lastUpdated: true,
              },
              where: {
                userId: currentUserId,
              },
            },
          }
        : null),
    },
  }) as const satisfies PostRelationalProjection;

const fetchPostsList = ({
  currentUserId,
  where,
  orderBy,
  offset,
  limit,
}: {
  currentUserId: string | null;
  where?: PostsFilter;
  orderBy?: PostsOrderBy;
  offset?: number;
  limit?: number;
}) => {
  return db.query.posts.findMany({
    ...postsListProjection(currentUserId),
    where: {
      ...viewablePostFilter,
      ...where,
    },
    orderBy,
    offset,
    limit,
  });
};

export const fetchFrontpagePostsList = ({
  currentUserId,
  offset,
  limit,
  onlyTagId,
  excludeTagId,
}: {
  currentUserId: string | null;
  offset?: number;
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
    offset,
    limit,
  });
};

export type PostListItem = Awaited<
  ReturnType<typeof fetchFrontpagePostsList>
>[number];

export const fetchStickyPostsList = ({
  currentUserId,
  limit,
}: {
  currentUserId: string | null;
  limit: number;
}) => {
  const startHerePostId = process.env.START_HERE_POST_ID;
  return fetchPostsList({
    currentUserId,
    where: {
      sticky: true,
      ...(currentUserId && startHerePostId
        ? { _id: { ne: startHerePostId } }
        : null),
    },
    orderBy: {
      stickyPriority: "desc",
      postedAt: "asc",
    },
    limit,
  });
};

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

export const fetchPostsListFromView = (
  currentUserId: string | null,
  { view, ...props }: PostsListView,
) => {
  switch (view) {
    case "frontpage":
      return fetchFrontpagePostsList({ currentUserId, ...props });
    case "sticky":
      return fetchStickyPostsList({ currentUserId, ...props });
    default:
      throw new Error("Invalid posts list view");
  }
};
