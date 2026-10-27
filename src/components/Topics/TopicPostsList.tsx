import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import type { TopicPostsSortedBy } from "@/lib/tags/topicPageParams";

export default async function TopicPostsList(
  _props: Readonly<{ tag: TopicPageTag; sortedBy: TopicPostsSortedBy }>,
) {
  return null;
}
