import type { CommentTag, PostTag } from "@/lib/tags/tagQueries";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import TagChipDisplay, { TagChipVariant } from "./TagChipDisplay";
import TagBody from "../ContentStyles/TagBody";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default function TagChip({
  tag,
  variant,
}: Readonly<{
  tag: PostTag | CommentTag;
  variant?: TagChipVariant;
}>) {
  const name = "shortName" in tag && tag.shortName ? tag.shortName : tag.name;
  const url = tagGetPageUrl({ tag });
  return (
    <Tooltip
      interactable
      tooltipClassName="bg-gray-0! text-gray-900! p-0! shadow w-[270px]"
      title={
        <div className="flex flex-col gap-3 p-3 border border-gray-200">
          {tag.description && <TagBody html={tag.description} isExcerpt />}
          <Type style="bodyHeavy">
            <Link href={url} className="text-primary hover:opacity-70">
              View all {tag.postCount} posts
            </Link>
          </Type>
        </div>
      }
    >
      <TagChipDisplay
        name={name}
        href={url}
        core={tag.core}
        variant={variant ?? ("core" in tag && tag.core ? "core" : "default")}
      />
    </Tooltip>
  );
}
