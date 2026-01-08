import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  excludeTagFilter,
  PostsFilter,
  viewablePostFilter,
} from "../posts/postLists";
import { isNotTrue } from "../utils/queryHelpers";
import sortBy from "lodash/sortBy";
import type { Post, posts } from "../schema";
import type { CurrentUser } from "../users/currentUser";

type FeedSubquery<ResultType, SortKeyType> = {
  type: string;
  getSortKey: (item: ResultType) => SortKeyType;
  doQuery: (limit: number, cutoff?: SortKeyType) => Promise<Partial<ResultType>[]>;
};

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

const postColumns = {
  _id: true,
  lastCommentedAt: true,
} as const;

type RecentDiscussionPost = Pick<Post, keyof typeof postColumns>;

const buildRecentDiscussionsSubqueries = (
  currentUser: CurrentUser | null,
): FeedSubquery<RecentDiscussionPost, Date>[] => {
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
      getSortKey: (post) => new Date(post.lastCommentedAt ?? 0),
      doQuery: (limit, cutoff) =>
        db.query.posts.findMany({
          columns: postColumns,
          where: {
            ...postSelector,
            shortform: isNotTrue,
            ...(cutoff ? { lastCommentedAt: { lt: cutoff.toISOString() } } : null),
          },
          orderBy: {
            lastCommentedAt: "desc",
          },
          limit,
        }),
    },
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
  const subqueries = buildRecentDiscussionsSubqueries(currentUser);

  // Perform the subqueries
  const unsortedSubqueryResults = await Promise.all(
    subqueries.map(async (subquery) => {
      const subqueryResults = await subquery.doQuery(limit, cutoff);
      return subqueryResults.map((result) => ({
        type: subquery.type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sortKey: subquery.getSortKey(result as any),
        [subquery.type]: result,
      }));
    }),
  );

  // Sort by shared sort key and apply cutoff
  const sortedResults = sortBy(unsortedSubqueryResults.flat(), "sortKey").reverse();
  const withCutoffApplied = cutoff
    ? sortedResults.filter(({ sortKey }) => sortKey < cutoff)
    : sortedResults;

  // TODO: Here insert numerically positioned results first
  const results = withCutoffApplied.slice(0, limit);
  const nextCutoff = results.length > 0 ? results[results.length - 1].sortKey : null;
  return {
    results,
    cutoff: nextCutoff,
    endOffset: (offset || 0) + results.length,
  };
};
