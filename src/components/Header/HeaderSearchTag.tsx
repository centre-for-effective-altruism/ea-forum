import type { SearchTag } from "@/lib/search/searchDocuments";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import TagIcon from "@heroicons/react/24/solid/TagIcon";
import HeaderSearchResult from "./HeaderSearchResult";
import Type from "../Type";

export default function HeaderSearchTag({
  tag,
}: Readonly<{
  tag: SearchTag;
}>) {
  return (
    <HeaderSearchResult
      tooltipTitle="Topic"
      href={tagGetPageUrl({ tag, from: "search_autocomplete" })}
      Icon={TagIcon}
    >
      <div>
        <Type style="postTitle">{tag.name}</Type>
        <div className="line-clamp-2">{tag.description}</div>
      </div>
    </HeaderSearchResult>
  );
}
