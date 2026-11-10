import sortBy from "lodash/sortBy";
import { db } from "../db";
import ElasticClient from "../search/elastic/ElasticClient";
import { collectionNameToConfig } from "../search/elastic/ElasticConfig";
import {
  getElasticIndexName,
  type SearchIndexCollectionName,
} from "../search/elastic/elasticIndexes";
import { fetchPostsListByIds, type PostListItem } from "../posts/postLists";
import {
  fetchCommentsListByIds,
  type CommentListItem,
} from "../comments/commentLists";
import type { CurrentUser } from "../users/currentUser";

export const fetchKeywordAlerts = async (userId: string): Promise<string[]> => {
  const user = await db.query.users.findFirst({
    columns: { keywordAlerts: true },
    where: { _id: userId },
  });
  return user?.keywordAlerts ?? [];
};

const fetchKeywordAlertResultIds = async ({
  collectionName,
  fields,
  keyword,
  startDate,
  endDate,
}: {
  collectionName: SearchIndexCollectionName;
  fields: string[];
  keyword: string;
  startDate: Date;
  endDate: Date;
}): Promise<string[]> => {
  const results = await new ElasticClient().getClient().search({
    index: getElasticIndexName(collectionName),
    from: 0,
    size: 100,
    filter_path: ["hits.hits._id"],
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query: keyword,
              fields: fields.map((fieldName) => `${fieldName}.exact`),
              type: "phrase",
            },
          },
        ],
        filter: [
          ...(collectionNameToConfig(collectionName).filters ?? []),
          {
            range: {
              postedAt: {
                gte: startDate.toISOString(),
                lt: endDate.toISOString(),
              },
            },
          },
        ],
      },
    },
  });
  return results?.hits?.hits?.flatMap(({ _id }) => (_id ? [_id] : [])) ?? [];
};

export type KeywordAlertResult =
  | { type: "post"; post: PostListItem }
  | { type: "comment"; comment: CommentListItem };

export const fetchKeywordAlertResults = async ({
  currentUser,
  keyword,
  startDate,
  endDate,
}: {
  currentUser: CurrentUser | null;
  keyword: string;
  startDate: Date;
  endDate: Date;
}): Promise<KeywordAlertResult[]> => {
  const [postIds, commentIds] = await Promise.all([
    fetchKeywordAlertResultIds({
      collectionName: "Posts",
      fields: ["title", "body"],
      keyword,
      startDate,
      endDate,
    }),
    fetchKeywordAlertResultIds({
      collectionName: "Comments",
      fields: ["body"],
      keyword,
      startDate,
      endDate,
    }),
  ]);
  const [posts, comments] = await Promise.all([
    postIds.length ? fetchPostsListByIds(currentUser?._id ?? null, postIds) : [],
    fetchCommentsListByIds({ currentUser, commentIds }),
  ]);
  const results: KeywordAlertResult[] = [
    ...posts.map((post) => ({ type: "post" as const, post })),
    ...comments.map((comment) => ({ type: "comment" as const, comment })),
  ];
  return sortBy(results, (result) => {
    const postedAt =
      result.type === "post" ? result.post.postedAt : result.comment.postedAt;
    return -new Date(postedAt ?? 0).getTime();
  });
};
