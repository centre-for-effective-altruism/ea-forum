import { SQL, sql } from "drizzle-orm";
import sortBy from "lodash/sortBy";
import type { FilterSettings } from "../filterSettings";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { postStatuses, type PostsListView } from "./postsHelpers";
import { coauthorsSelector, userBaseProjection } from "../users/userQueries";
import { fetchOrgUpdatesTagId, postTagsProjection } from "../tags/tagQueries";
import { nDaysAgo } from "../timeUtils";
import {
  htmlSubstring,
  RelationalFilter,
  RelationalOrderBy,
  RelationalProjection,
} from "@/lib/utils/queryHelpers";
import {
  currentUserIsSharedSelector,
  currentUserUsedLinkKeySelector,
  currentUserSuggestedCurationSelector,
  filterSettingsToSelector,
} from "./postQueries";

const SCORE_BIAS = 2;
const TIME_DECAY_FACTOR = 0.8;
const CUTOFF_DAYS = 21;
const EPOCH_ISO_DATE = "1970-01-01 00:00:00";

// TODO: Maybe this should be a function that takes the current user and does
// permission checks
export const viewablePostFilter = {
  draft: false,
  deletedDraft: false,
  isFuture: false,
  unlisted: false,
  shortform: false,
  rejected: false,
  authorIsUnreviewed: false,
  hiddenRelatedQuestion: false,
  postedAt: { isNotNull: true },
  status: postStatuses.STATUS_APPROVED,
} as const;

/** Create a filter to return _only_ posts with a particular tag */
const onlyTagFilter = (tagId: string) => (postsTable: typeof posts) =>
  sql`(${postsTable.tagRelevance} ->> ${tagId})::FLOAT >= 1`;

/** Create a filter to exclude posts with a particular tag */
export const excludeTagFilter = (tagId: string) => (postsTable: typeof posts) =>
  sql`COALESCE((${postsTable.tagRelevance}->>${tagId})::FLOAT, 0) < 1`;

/**
 * New and upvoted sorting: Calculate score from karma with bonuses for
 * frontpage/curated posts, then divide by a time decay factor.
 */
const magicSort =
  (scoreField = (postsTable: typeof posts) => sql`${postsTable}."score"`) =>
  (postsTable: typeof posts) => sql`
  ${postsTable}."sticky" DESC,
  ${postsTable}."stickyPriority" DESC,
  (${scoreField(postsTable)}) / POW(
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
      draft: true,
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
      // TODO: Move these rarely used event fields into a separate type?
      startTime: true,
      onlineEvent: true,
      googleLocation: true,
    },
    extras: {
      coauthors: coauthorsSelector,
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
          name: true,
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
  filterSettings,
}: {
  currentUserId: string | null;
  offset?: number;
  limit: number;
  onlyTagId?: string;
  excludeTagId?: string | string[];
  filterSettings?: FilterSettings;
}) => {
  let scoreField: ((postsTable: typeof posts) => SQL) | undefined;
  const filters: ((postsTable: typeof posts) => SQL)[] = [];
  if (onlyTagId) {
    filters.push(onlyTagFilter(onlyTagId));
  }
  if (excludeTagId) {
    const ids = Array.isArray(excludeTagId) ? excludeTagId : [excludeTagId];
    for (const id of ids) {
      filters.push(excludeTagFilter(id));
    }
  }
  if (filterSettings) {
    const { filter, score } = filterSettingsToSelector(filterSettings);
    filters.push(filter);
    scoreField = score;
  }
  return fetchPostsList({
    currentUserId,
    where: {
      isEvent: false,
      sticky: false,
      groupId: { isNull: true },
      postedAt: { gt: nDaysAgo(CUTOFF_DAYS).toISOString() },
      AND: filters.map((filter) => ({ RAW: (posts) => filter(posts) })),
    },
    orderBy: magicSort(scoreField),
    offset,
    limit,
  });
};

export const fetchFrontpageCuratedPostsList = async (
  currentUserId: string | null,
) => {
  return fetchPostsList({
    currentUserId,
    where: {
      curatedDate: { gte: nDaysAgo(5).toISOString() },
    },
    orderBy: {
      sticky: "desc",
      curatedDate: "desc",
      postedAt: "desc",
    },
    limit: currentUserId ? 3 : 2,
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

export const fetchPostsListById = async (
  currentUserId: string | null,
  postId: string,
): Promise<PostListItem | null> => {
  const posts = await fetchPostsList({
    currentUserId,
    where: {
      _id: postId,
    },
    limit: 1,
  });
  return posts[0] ?? null;
};

export const fetchPostsListByIds = async (
  currentUserId: string | null,
  postIds: string[],
): Promise<PostListItem[]> => {
  const posts = await fetchPostsList({
    currentUserId,
    where: {
      _id: { in: postIds },
    },
  });
  const order = new Map(postIds.map((id, i) => [id, i]));
  return sortBy(posts, (p) => order.get(p._id) ?? Infinity);
};

export const fetchPingbackPosts = async (
  currentUserId: string | null,
  postId: string,
) =>
  fetchPostsList({
    currentUserId,
    where: {
      baseScore: { gt: 0 },
      RAW: (posts) =>
        sql`(${posts}."pingbacks"->'Posts') @> ${`"${postId}"`}::JSONB`,
    },
    orderBy: {
      baseScore: "desc",
    },
  });

export const fetchSidebarOpportunities = (
  currentUserId: string | null,
  limit: number,
) => {
  const tagId = process.env.OPPORTUNITIES_TAG_ID;
  if (!tagId) {
    console.warn("Opportunities tag ID is not configured");
    return Promise.resolve([]);
  }
  return fetchPostsList({
    currentUserId,
    where: {
      isEvent: false,
      sticky: false,
      groupId: { isNull: true },
      frontpageDate: { gt: EPOCH_ISO_DATE },
      postedAt: { gt: nDaysAgo(CUTOFF_DAYS).toISOString() },
      RAW: (postsTable: typeof posts) =>
        sql`(${postsTable.tagRelevance} ->> ${tagId})::FLOAT >= 1`,
    },
    orderBy: magicSort(),
    limit,
  });
};

export const fetchSidebarEvents = (currentUserId: string | null, limit: number) => {
  return fetchPostsList({
    currentUserId,
    where: {
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
  // TODO: Can we do this in a single drizzle query instead of fetching the post?
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
      isEvent: false,
      baseScore: { gte: minScore },
      disableRecommendation: false,
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
          sql`${postsTable.curatedDate} > NOW() - '7 days'::INTERVAL`,
        disableRecommendation: false,
        readStatus: currentUserId ? { isRead: false } : undefined,
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
          ${postsTable.frontpageDate} > NOW() - '7 days'::INTERVAL AND
          ${excludeTagFilter(process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID)(postsTable)}
        `,
        curatedDate: { isNull: true },
        groupId: { isNull: true },
        disableRecommendation: false,
        readStatus: currentUserId ? { isRead: false } : undefined,
        user: {
          deleted: false,
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
  // complicated - this will be enough for now though
  return fetchPostsList({
    currentUserId,
    where: {
      RAW: onlyTagFilter(process.env.OPPORTUNITIES_TAG_ID),
    },
    orderBy: magicSort(),
    limit,
  });
};

// TODO: Remove along with the /admin/org-updates-test page once the
// organization-updates layout experiment is concluded.
export const fetchOrgUpdatesPostsList = async ({
  currentUserId,
  offset,
  limit,
}: {
  currentUserId: string | null;
  offset?: number;
  limit: number;
}) => {
  const tagId = await fetchOrgUpdatesTagId();
  if (!tagId) {
    console.warn("Organization updates tag not found by slug");
    return [];
  }
  return fetchPostsList({
    currentUserId,
    where: {
      isEvent: false,
      sticky: false,
      groupId: { isNull: true },
      postedAt: { gt: nDaysAgo(CUTOFF_DAYS).toISOString() },
      RAW: onlyTagFilter(tagId),
    },
    orderBy: magicSort(),
    offset,
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
    case "orgUpdates":
      return fetchOrgUpdatesPostsList({ currentUserId, ...props });
    default:
      throw new Error("Invalid posts list view");
  }
};
