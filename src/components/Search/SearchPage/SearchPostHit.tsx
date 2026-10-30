import type { SearchPost } from "@/lib/search/searchDocuments";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import SearchSnippet from "./SearchSnippet";
import SearchHitAuthor from "./SearchHitAuthor";
import TimeAgo from "../../TimeAgo";
import Link from "../../Link";
import Type from "../../Type";

export default function SearchPostHit({ hit }: Readonly<{ hit: SearchPost }>) {
  return (
    <article
      data-component="SearchPostHit"
      className="flex flex-col gap-1 max-w-[720px] px-3 py-2 rounded hover:bg-gray-100"
    >
      <Type style="postTitle" className="text-gray-1000">
        <Link href={postGetPageUrl({ post: hit })} className="hover:opacity-70">
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
        <span>{hit.baseScore} karma</span>
        <TimeAgo textStyle="bodySmall" As="span" time={hit.postedAt} includeAgo />
      </Type>
      <SearchSnippet hit={hit} field="body" fallback={hit.body} />
    </article>
  );
}
