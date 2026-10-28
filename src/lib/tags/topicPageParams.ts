import { z } from "zod/v4";

export const topicPostsSortedByValues = [
  "relevance",
  "magic",
  "top",
  "topAdjusted",
  "recentComments",
  "new",
  "old",
] as const;

export type TopicPostsSortedBy = (typeof topicPostsSortedByValues)[number];

export const topicPostsSortedBySchema = z.enum(topicPostsSortedByValues);

export const topicPageTabSchema = z.enum(["posts", "wiki"]).catch("posts");

export type TopicPageTab = z.infer<typeof topicPageTabSchema>;

export const getTopicPostsSortedBy = (
  query: string | string[] | undefined,
  postsDefaultSortOrder: string | null,
): TopicPostsSortedBy => {
  const fromQuery = topicPostsSortedBySchema.safeParse(query);
  if (fromQuery.success) {
    return fromQuery.data;
  }
  const fromTag = topicPostsSortedBySchema.safeParse(postsDefaultSortOrder);
  return fromTag.success ? fromTag.data : "top";
};
