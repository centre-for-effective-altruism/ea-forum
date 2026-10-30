import type { SearchTag } from "@/lib/search/searchDocuments";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import SearchSnippet from "./SearchSnippet";
import Link from "../../Link";
import Type from "../../Type";

export default function SearchTagHit({ hit }: Readonly<{ hit: SearchTag }>) {
  return (
    <article
      data-component="SearchTagHit"
      className="flex flex-col gap-1 max-w-[720px] px-3 py-2 rounded hover:bg-gray-100"
    >
      <Type style="postTitle" className="text-gray-1000">
        <Link
          href={tagGetPageUrl({ tag: hit, from: "search_page" })}
          className="hover:opacity-70"
        >
          {hit.name}
        </Link>
      </Type>
      <Type style="bodySmall" className="text-gray-600">
        {hit.postCount} post{hit.postCount === 1 ? "" : "s"}
      </Type>
      <SearchSnippet hit={hit} field="description" fallback={hit.description} />
    </article>
  );
}
