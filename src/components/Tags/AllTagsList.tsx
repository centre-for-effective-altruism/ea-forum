import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import { fetchAllTags } from "@/lib/tags/tagQueries";
import TagTooltip from "../TagTooltip";
import Type from "../Type";
import Link from "../Link";

export default async function AllTagsList() {
  const allTags = await fetchAllTags();
  return (
    <div
      data-component="AllTagsList"
      className="
        rounded bg-gray-0 px-5 py-3 grid gap-x-4 gap-y-2
        grid-cols-1 sm:grid-cols-2 md:grid-cols-3
      "
    >
      {allTags.map((tag) => (
        <TagTooltip key={tag._id} tag={tag} placement="top-start">
          <Type style="bodyMedium" className="leading-[110%]">
            <Link href={tagGetPageUrl({ tag })}>
              {tag.name} <span className="text-gray-600">({tag.postCount})</span>
            </Link>
          </Type>
        </TagTooltip>
      ))}
    </div>
  );
}
