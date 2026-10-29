import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import { getTopicDescription } from "@/lib/tags/topicDescription";
import TopicTocList from "./TopicTocList";

export default function TopicTableOfContents({
  tag,
  className,
}: Readonly<{ tag: TopicPageTag; className?: string }>) {
  const { tableOfContents } = getTopicDescription(tag);
  return (
    <TopicTocList
      title={tag.name}
      contents={tableOfContents}
      className={className}
    />
  );
}
