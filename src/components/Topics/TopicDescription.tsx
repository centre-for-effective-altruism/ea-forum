import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import { getTopicDescription } from "@/lib/tags/topicDescription";
import TopicDescriptionBody from "./TopicDescriptionBody";

export default function TopicDescription({
  tag,
  className,
}: Readonly<{ tag: TopicPageTag; className?: string }>) {
  const { html, truncatedHtml } = getTopicDescription(tag);
  if (!html) {
    return null;
  }
  return (
    <TopicDescriptionBody
      tagId={tag._id}
      html={html}
      truncatedHtml={truncatedHtml}
      className={className}
    />
  );
}
