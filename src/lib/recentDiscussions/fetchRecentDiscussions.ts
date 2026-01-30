import sortBy from "lodash/sortBy";
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
import type { TagFromProjection, TagRelationalProjection } from "../tags/tagQueries";
import type { posts } from "../schema";
import type { CurrentUser } from "../users/currentUser";
import { userBaseProjection } from "../users/userQueries";
import { htmlSubstring, isNotTrue } from "../utils/queryHelpers";

const MAX_COMMENT_AGE_HOURS = 18;
const MAX_COMMENTS_PER_POST = 5;

const getPostProjection = ({
  currentUserId,
  excludeTopLevel,
}: {
  currentUserId: string | null;
  excludeTopLevel: boolean;
}) => {
  const postProj = postsListProjection(currentUserId, { highlightLength: 500 });
  const commentProj = commentListProjection(currentUserId);
  return {
    columns: {
      ...postProj.columns,
      lastCommentReplyAt: true,
      draft: true,
    },
    extras: postProj.extras,
    with: {
      ...postProj.with,
      comments: {
        ...commentProj,
        with: {
          ...commentProj.with,
          topLevelComment: commentProj,
        },
        where: {
          ...viewableCommentFilter(currentUserId),
          score: { gt: 0 },
          deletedPublic: isNotTrue,
          parentCommentId: excludeTopLevel ? { isNotNull: true } : undefined,
          RAW: (commentsTable) => sql`(
            ${commentsTable}."postedAt" >
              COALESCE("lastCommentedAt", NOW()) -
                MAKE_INTERVAL(hours => ${MAX_COMMENT_AGE_HOURS})
          )`,
        },
        limit: MAX_COMMENTS_PER_POST,
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

const getTagProjection = (currentUserId: string | null) =>
  ({
    columns: {
      _id: true,
      slug: true,
      name: true,
      lastCommentedAt: true,
      postCount: true,
      wikiOnly: true,
    },
    extras: {
      html: htmlSubstring(sql`"description"->>'html'`, 500),
    },
    with: {
      comments: {
        ...getCommentProjection(currentUserId),
        where: {
          ...viewableCommentFilter(currentUserId),
          score: { gt: 0 },
          deletedPublic: false,
          RAW: (commentsTable) => sql`(
          ${commentsTable}."postedAt" >
            COALESCE("lastCommentedAt", NOW()) -
              MAKE_INTERVAL(hours => ${MAX_COMMENT_AGE_HOURS})
        )`,
        },
        limit: MAX_COMMENTS_PER_POST,
        orderBy: {
          postedAt: "desc",
        },
      },
    },
  }) as const satisfies TagRelationalProjection;

export type RecentDiscussionTag = TagFromProjection<
  ReturnType<typeof getTagProjection>
>;

const getRevisionProjection = (currentUserId: string | null) =>
  ({
    columns: {
      _id: true,
      editedAt: true,
      changeMetrics: true,
    },
    with: {
      user: userBaseProjection,
      tag: getTagProjection(currentUserId),
    },
  }) as const satisfies RevisionRelationalProjection;

export type RecentDiscussionRevision = RevisionFromProjection<
  ReturnType<typeof getRevisionProjection>
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

const buildRecentDiscussionsSubqueries = (
  currentUser: CurrentUser | null,
): RecentDiscussionsSubquery[] => {
  const currentUserId = currentUser?._id ?? null;
  const postProjection = getPostProjection({
    currentUserId,
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
          ...getCommentProjection(currentUserId),
          where: {
            ...viewableCommentFilter(currentUserId),
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
          ...getTagProjection(currentUserId),
          where: {
            deleted: isNotTrue,
            adminOnly: isNotTrue,
            ...(cutoff
              ? { lastCommentedAt: { lt: new Date(cutoff).toISOString() } }
              : { lastCommentedAt: { isNotNull: true } }),
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
          ...getRevisionProjection(currentUserId),
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
  | { type: "tagDiscussed"; item: RecentDiscussionTag }
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
  limit,
  cutoff,
  offset,
}: {
  currentUser: CurrentUser | null;
  limit: number;
  cutoff?: Date;
  offset?: number;
}) => {
  const cutoffMs = cutoff?.getTime();
  const subqueries = buildRecentDiscussionsSubqueries(currentUser);

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
