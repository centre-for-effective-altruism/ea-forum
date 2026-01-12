import type { PostTag } from "@/lib/tags/tagQueries";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import TagChipDisplay from "./TagChipDisplay";

// TODO: Add tag popover

export default function TagChip({ tag }: Readonly<{ tag: PostTag }>) {
  return (
    <TagChipDisplay
      name={tag.name}
      href={tagGetPageUrl({ tag })}
      variant={tag.core ? "core" : "default"}
    />
  );
}
