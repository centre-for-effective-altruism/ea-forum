import type { CommentTag, PostTag } from "@/lib/tags/tagQueries";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import TagChipDisplay, { TagChipVariant } from "./TagChipDisplay";
import Tooltip from "../Tooltip";

export default function TagChip({
  tag,
  variant,
}: Readonly<{
  tag: PostTag | CommentTag;
  variant?: TagChipVariant;
}>) {
  const name = "shortName" in tag && tag.shortName ? tag.shortName : tag.name;
  return (
    <Tooltip
      tooltipClassName="bg-gray-0! text-gray-900! p-0! shadow w-[270px]"
      title={<div>Hello world</div>}
    >
      <TagChipDisplay
        name={name}
        href={tagGetPageUrl({ tag })}
        core={tag.core}
        variant={variant ?? ("core" in tag && tag.core ? "core" : "default")}
      />
    </Tooltip>
  );
}
