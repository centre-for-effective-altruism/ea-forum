import type { SearchTag } from "@/lib/search/searchDocuments";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import TagIcon from "@heroicons/react/24/outline/TagIcon";
import HeaderSearchResult from "./HeaderSearchResult";
import Type from "../Type";

export default function HeaderSearchTag({
  tag,
  selected,
}: Readonly<{
  tag: SearchTag;
  selected?: boolean;
}>) {
  return (
    <HeaderSearchResult
      selected={selected}
      href={tagGetPageUrl({ tag, from: "search_autocomplete" })}
      Icon={TagIcon}
    >
      <div>
        <Type style="postTitle" className="text-gray-800">
          {tag.name}
        </Type>
        <div className="line-clamp-2">{tag.description}</div>
      </div>
    </HeaderSearchResult>
  );
}
