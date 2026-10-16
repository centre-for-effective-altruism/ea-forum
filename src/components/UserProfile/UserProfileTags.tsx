import { filterNonNull } from "@/lib/typeHelpers";
import { fetchTagsByIds } from "@/lib/tags/tagQueries";
import TagChip from "../Tags/TagChip";
import Type from "../Type";
import clsx from "clsx";

export default async function UserProfileTags({
  tagIds,
  className,
}: Readonly<{
  tagIds: string[];
  className?: string;
}>) {
  if (!tagIds.length) {
    return null;
  }
  const tagsById = await fetchTagsByIds(tagIds);
  const tags = filterNonNull(tagIds.map((id) => tagsById[id]));
  if (!tags.length) {
    return null;
  }
  return (
    <div
      data-component="UserProfileTags"
      className={clsx("flex items-center gap-x-0.5 gap-y-1 flex-wrap", className)}
    >
      <Type className="text-gray-600 mr-1">Interests:</Type>
      {tags.map((tag) => (
        <TagChip key={tag._id} tag={tag} />
      ))}
    </div>
  );
}
