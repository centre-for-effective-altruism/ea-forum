import type { CommentTag, PostTag } from "@/lib/tags/tagQueries";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import TagChipDisplay, { TagChipVariant } from "./TagChipDisplay";
import TagTooltip from "./TagTooltip";

export default function TagChip({
  tag,
  variant,
}: Readonly<{
  tag: PostTag | CommentTag;
  variant?: TagChipVariant;
}>) {
  return (
    <TagTooltip tag={tag}>
      <TagChipDisplay
        name={"shortName" in tag && tag.shortName ? tag.shortName : tag.name}
        href={tagGetPageUrl({ tag })}
        core={tag.core}
        variant={variant ?? ("core" in tag && tag.core ? "core" : "default")}
      />
    </TagTooltip>
  );
}
