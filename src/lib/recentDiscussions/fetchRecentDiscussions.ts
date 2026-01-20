import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  excludeTagFilter,
  PostsFilter,
  PostRelationalProjection,
  viewablePostFilter,
  PostFromProjection,
  postsListProjection,
} from "../posts/postLists";
import {
  CommentFromProjection,
  commentListProjection,
  CommentRelationalProjection,
  viewableCommentFilter,
} from "../comments/commentLists";
import type {
  RevisionFromProjection,
  RevisionRelationalProjection,
} from "../revisions/revisionQueries";
import { userDefaultProjection } from "../users/userQueries";
import { isNotTrue } from "../utils/queryHelpers";
import sortBy from "lodash/sortBy";
import type { posts, Tag } from "../schema";
import type { CurrentUser } from "../users/currentUser";

const getPostProjection = ({
  currentUserId,
  maxCommentAgeHours,
  maxCommentsPerPost,
  excludeTopLevel,
}: {
  currentUserId: string | null;
  maxCommentAgeHours: number;
  maxCommentsPerPost: number;
  excludeTopLevel: boolean;
}) => {
  const projection = postsListProjection(currentUserId, { highlightLength: 500 });
  return {
    columns: {
      ...projection.columns,
      lastCommentReplyAt: true,
      draft: true,
    },
    extras: projection.extras,
    with: {
      ...projection.with,
      comments: {
        ...commentListProjection(currentUserId),
        where: {
          ...viewableCommentFilter,
          score: { gt: 0 },
          deletedPublic: isNotTrue,
          parentCommentId: excludeTopLevel ? { isNotNull: true } : undefined,
          // TODO HACK: Using the `d0` table alias here is a hack because drizzle
          // currently doesn't offer a way to access the correct table alias
          // programatically. This should be stable for the current version of
          // drizzle, but it's liable to break on version upgrades.
          RAW: (commentsTable) => sql`(
            ${commentsTable}."postedAt" >
              COALESCE("d0"."lastCommentedAt", NOW()) -
                MAKE_INTERVAL(hours => ${maxCommentAgeHours})
          )`,
        },
        limit: maxCommentsPerPost,
        orderBy: {
          postedAt: "desc",
        },
      },
    },
  } as const satisfies PostRelationalProjection;
};

export type RecentDiscussionPost = PostFromProjection<
  ReturnType<typeof getPostProjection>
>;

const getCommentProjection = (currentUserId: string | null) => {
  const base = commentListProjection(currentUserId);
  return {
    ...base,
    with: {
      ...base.with,
      post: {
        columns: {
          _id: true,
          slug: true,
          title: true,
        },
      },
    },
  } as const satisfies CommentRelationalProjection;
};

export type RecentDiscussionComment = CommentFromProjection<
  ReturnType<typeof getCommentProjection>
>;

const tagColumns = {
  _id: true,
  slug: true,
  name: true,
  lastCommentedAt: true,
} as const;

export type RecentDiscussionTag = Pick<Tag, keyof typeof tagColumns>;

const revisionProjection = {
  columns: {
    _id: true,
    editedAt: true,
    changeMetrics: true,
  },
  with: {
    user: userDefaultProjection,
    tag: {
      columns: tagColumns,
    },
  },
} as const satisfies RevisionRelationalProjection;

export type RecentDiscussionRevision = RevisionFromProjection<
  typeof revisionProjection
>;

type FeedSubquery<ResultType, SortKeyType> = {
  type: string;
  getSortKey: (item: ResultType) => SortKeyType;
  doQuery: (limit: number, cutoff?: SortKeyType) => Promise<Partial<ResultType>[]>;
};

type RecentDiscussionsSubquery =
  | FeedSubquery<RecentDiscussionPost, number>
  | FeedSubquery<RecentDiscussionComment, number>
  | FeedSubquery<RecentDiscussionTag, number>
  | FeedSubquery<RecentDiscussionRevision, number>;

const getPostCommunityFilter = (
  postsTable: typeof posts,
  currentUser: CurrentUser | null,
) => {
  const tagId = process.env.COMMUNITY_TAG_ID;
  // We default to hiding posts tagged with "Community" from Recent Discussions
  // if they have at least 10 comments, or if the current user has manually set
  // `hideCommunitySection` to true
  if (!tagId || currentUser?.showCommunityInRecentDiscussion) {
    return sql``;
  }
  if (currentUser?.hideCommunitySection) {
    return sql`AND ${excludeTagFilter(tagId)(postsTable)}`;
  }
  return sql`AND (
    ${excludeTagFilter(tagId)(postsTable)} OR
    ${postsTable}."commentCount" < 10
  )`;
};

const buildRecentDiscussionsSubqueries = ({
  currentUser,
  maxCommentAgeHours,
  maxCommentsPerPost,
}: {
  currentUser: CurrentUser | null;
  maxCommentAgeHours: number;
  maxCommentsPerPost: number;
}): RecentDiscussionsSubquery[] => {
  const postProjection = getPostProjection({
    currentUserId: currentUser?._id ?? null,
    maxCommentAgeHours,
    maxCommentsPerPost,
    excludeTopLevel: true,
  });
  const postSelector: PostsFilter = {
    ...viewablePostFilter,
    baseScore: { gt: 0 },
    hideFrontpageComments: isNotTrue,
    hideFromRecentDiscussions: isNotTrue,
    lastCommentedAt: { isNotNull: true },
    OR: [{ isEvent: false }, { globalEvent: true }, { commentCount: { gt: 0 } }],
    RAW: (postsTable) => sql`
      ${excludeTagFilter(process.env.TRANSLATION_TAG_ID)(postsTable)}
      ${getPostCommunityFilter(postsTable, currentUser)}
    `,
  };
  return [
    {
      type: "postCommented",
      getSortKey: (post) => new Date(post.lastCommentedAt ?? 0).getTime(),
      doQuery: (limit, cutoff) =>
        db.query.posts.findMany({
          ...postProjection,
          where: {
            ...postSelector,
            shortform: isNotTrue,
            ...(cutoff
              ? { lastCommentedAt: { lt: new Date(cutoff).toISOString() } }
              : null),
          },
          orderBy: {
            lastCommentedAt: "desc",
          },
          limit,
        }),
    } as FeedSubquery<RecentDiscussionPost, number>,
    {
      type: "newQuickTake",
      getSortKey: (comment) => new Date(comment.postedAt).getTime(),
      doQuery: (limit, cutoff) =>
        db.query.comments.findMany({
          ...getCommentProjection(currentUser?._id ?? null),
          where: {
            ...viewableCommentFilter,
            baseScore: { gt: 0 },
            shortform: true,
            parentCommentId: { isNull: true },
            descendentCount: 0,
            ...(cutoff
              ? { postedAt: { lt: new Date(cutoff).toISOString() } }
              : null),
          },
          orderBy: {
            postedAt: "desc",
          },
          limit,
        }),
    } as FeedSubquery<RecentDiscussionComment, number>,
    {
      type: "quickTakeCommented",
      getSortKey: (post) => new Date(post.lastCommentReplyAt ?? 0).getTime(),
      doQuery: (limit, cutoff) =>
        db.query.posts.findMany({
          ...postProjection,
          where: {
            ...postSelector,
            shortform: true,
            ...(cutoff
              ? { lastCommentReplyAt: { lt: new Date(cutoff).toISOString() } }
              : null),
          },
          orderBy: {
            lastCommentReplyAt: "desc",
          },
          limit,
        }),
    } as FeedSubquery<RecentDiscussionPost, number>,
    {
      type: "tagDiscussed",
      getSortKey: (tag) => new Date(tag.lastCommentedAt ?? 0).getTime(),
      doQuery: (limit, cutoff) =>
        db.query.tags.findMany({
          columns: tagColumns,
          where: {
            wikiOnly: isNotTrue,
            deleted: isNotTrue,
            adminOnly: isNotTrue,
            ...(cutoff
              ? { lastCommentedAt: { lt: new Date(cutoff).toISOString() } }
              : null),
          },
          orderBy: {
            lastCommentedAt: "desc",
          },
          limit,
        }),
    } as FeedSubquery<RecentDiscussionTag, number>,
    {
      type: "tagRevised",
      getSortKey: (tag) => new Date(tag.editedAt ?? 0).getTime(),
      doQuery: (limit, cutoff) =>
        db.query.revisions.findMany({
          ...revisionProjection,
          where: {
            collectionName: "Tags",
            fieldName: "description",
            editedAt: { isNotNull: true },
            RAW: (revisionsTable) =>
              sql`(${revisionsTable}."changeMetrics"->'added')::INTEGER > 100`,
            ...(cutoff
              ? { editedAt: { lt: new Date(cutoff).toISOString() } }
              : null),
          },
          orderBy: {
            editedAt: "desc",
          },
          limit,
        }),
    } as FeedSubquery<RecentDiscussionRevision, number>,
  ];
};

type RecentDiscussionsItem = { sortKey: number } & (
  | { type: "postCommented"; item: RecentDiscussionPost }
  | { type: "newQuickTake"; item: RecentDiscussionComment }
  | { type: "quickTakeCommented"; item: RecentDiscussionPost }
  | { type: "tagDiscussed"; item: RecentDiscussionPost }
  | { type: "tagRevised"; item: RecentDiscussionRevision }
  | { type: "subscribeReminder"; item: null }
);

/**
 * We add an item to the feed to prompt the user to subscribe to the newsletter.
 * This is always position at index 3 in the feed.
 */
const insertSubscribeReminder = (
  results: RecentDiscussionsItem[],
  offset: number | undefined = 0,
): RecentDiscussionsItem[] => {
  const index = 3;
  const pageStart = offset;
  const pageEnd = offset + results.length;

  if (pageStart > index || pageEnd <= index) {
    return results;
  }

  const insertAt = index - pageStart;
  return [
    ...results.slice(0, insertAt),
    {
      type: "subscribeReminder",
      sortKey: NaN,
      item: null,
    },
    ...results.slice(insertAt),
  ];
};

export const fetchRecentDiscussions = async ({
  currentUser,
  maxCommentAgeHours = 18,
  maxCommentsPerPost = 5,
  limit,
  cutoff,
  offset,
}: {
  currentUser: CurrentUser | null;
  maxCommentAgeHours?: number;
  maxCommentsPerPost?: number;
  limit: number;
  cutoff?: Date;
  offset?: number;
}) => {
  const cutoffMs = cutoff?.getTime();
  const subqueries = buildRecentDiscussionsSubqueries({
    currentUser,
    maxCommentAgeHours,
    maxCommentsPerPost,
  });

  // Perform the subqueries
  const unsortedSubqueryResults = (await Promise.all(
    subqueries.map(async (subquery) => {
      const subqueryResults = await subquery.doQuery(limit, cutoffMs);
      return subqueryResults.map((result) => ({
        type: subquery.type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sortKey: subquery.getSortKey(result as any),
        item: result,
      }));
    }),
  )) as unknown as RecentDiscussionsItem[];

  // Sort by shared sort key and apply cutoff
  const sortedResults = sortBy(unsortedSubqueryResults.flat(), "sortKey").reverse();
  const withCutoffApplied = cutoffMs
    ? sortedResults.filter(({ sortKey }) => sortKey < cutoffMs)
    : sortedResults;

  // Insert the subscribe reminder and apply final limit
  const allResults = insertSubscribeReminder(withCutoffApplied, offset);
  const results = allResults.slice(0, limit);
  const nextCutoff = results.length > 0 ? results[results.length - 1].sortKey : null;
  return {
    results,
    cutoff: nextCutoff,
    endOffset: (offset || 0) + results.length,
  };
};

export type RecentDiscussionsData = Awaited<
  ReturnType<typeof fetchRecentDiscussions>
>;
