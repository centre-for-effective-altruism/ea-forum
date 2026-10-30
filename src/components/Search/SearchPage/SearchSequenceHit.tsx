import type { SearchSequence } from "@/lib/search/searchDocuments";
import { sequenceGetPageUrl } from "@/lib/sequences/sequenceHelpers";
import SearchSnippet from "./SearchSnippet";
import SearchHitAuthor from "./SearchHitAuthor";
import TimeAgo from "../../TimeAgo";
import Link from "../../Link";
import Type from "../../Type";

export default function SearchSequenceHit({
  hit,
}: Readonly<{ hit: SearchSequence }>) {
  return (
    <article
      data-component="SearchSequenceHit"
      className="flex flex-col gap-1 max-w-[720px] px-3 py-2 rounded hover:bg-gray-100"
    >
      <Type style="postTitle" className="text-gray-1000">
        <Link
          href={sequenceGetPageUrl({ sequence: hit })}
          className="hover:opacity-70"
        >
          {hit.title}
        </Link>
      </Type>
      <Type
        style="bodySmall"
        className="flex flex-wrap items-center gap-x-2 text-gray-600"
      >
        <SearchHitAuthor
          authorSlug={hit.authorSlug}
          authorDisplayName={hit.authorDisplayName}
        />
        <TimeAgo textStyle="bodySmall" As="span" time={hit.createdAt} includeAgo />
      </Type>
      <SearchSnippet
        hit={hit}
        field="plaintextDescription"
        fallback={hit.plaintextDescription}
      />
    </article>
  );
}
