import type { CommentTag, PostTag } from "@/lib/tags/tagQueries";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import TagChipDisplay, { TagChipVariant } from "./TagChipDisplay";
import TagTooltip from "../TagTooltip";

export default function TagChip({
  tag,
  variant,
  className,
}: Readonly<{
  tag: PostTag | CommentTag;
  variant?: TagChipVariant;
  className?: string;
}>) {
  return (
    <TagTooltip tag={tag} placement="bottom-start" className={className}>
      <TagChipDisplay
        name={"shortName" in tag && tag.shortName ? tag.shortName : tag.name}
        href={tagGetPageUrl({ tag })}
        core={tag.core}
        variant={variant ?? ("core" in tag && tag.core ? "core" : "default")}
      />
    </TagTooltip>
  );
}
