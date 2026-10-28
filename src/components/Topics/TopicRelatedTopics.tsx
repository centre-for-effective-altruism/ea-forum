import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import clsx from "clsx";
import TagChip from "../Tags/TagChip";
import Type from "../Type";

export default function TopicRelatedTopics({
  tag,
  className,
}: Readonly<{ tag: TopicPageTag; className?: string }>) {
  const { parentTag, subTags } = tag;
  if (!parentTag && !subTags.length) {
    return null;
  }
  return (
    <div
      data-component="TopicRelatedTopics"
      className={clsx("flex flex-wrap items-center gap-x-6 gap-y-2", className)}
    >
      {parentTag && (
        <div className="flex items-center gap-2">
          <Type className="text-gray-600">Parent topic:</Type>
          <TagChip tag={parentTag} />
        </div>
      )}
      {subTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Type className="text-gray-600">
            {subTags.length === 1 ? "Sub-topic:" : "Sub-topics:"}
          </Type>
          {subTags.map((subTag) => (
            <TagChip key={subTag._id} tag={subTag} />
          ))}
        </div>
      )}
    </div>
  );
}
