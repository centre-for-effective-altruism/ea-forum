import type { SearchComment } from "@/lib/search/searchDocuments";
import { commentGetPageUrlFromIds } from "@/lib/comments/commentHelpers";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import SearchSnippet from "./SearchSnippet";
import SearchHitAuthor from "./SearchHitAuthor";
import TimeAgo from "../../TimeAgo";
import Link from "../../Link";
import Type from "../../Type";

const getCommentUrl = (hit: SearchComment, permalink = true) =>
  commentGetPageUrlFromIds({
    commentId: hit._id,
    postId: hit.postId,
    postSlug: hit.postSlug,
    tagSlug: hit.tagSlug,
    tagCommentType: hit.tagCommentType,
    permalink,
  });

const getParent = (hit: SearchComment) => {
  if (hit.postId && hit.postTitle) {
    return {
      title: hit.postTitle,
      url: postGetPageUrl({
        post: {
          _id: hit.postId,
          slug: hit.postSlug ?? "",
          isEvent: hit.postIsEvent,
          groupId: hit.postGroupId,
        },
      }),
    };
  }
  if (hit.tagSlug && hit.tagName) {
    return {
      title: hit.tagName,
      url: tagGetPageUrl({ tag: { slug: hit.tagSlug }, from: "search_page" }),
    };
  }
  return null;
};

export default function SearchCommentHit({ hit }: Readonly<{ hit: SearchComment }>) {
  const parent = getParent(hit);
  return (
    <article
      data-component="SearchCommentHit"
      className="
        flex flex-col gap-1 max-w-[720px] px-3 py-2 rounded hover:bg-gray-100
      "
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <Type style="bodyHeavy" As="span" className="text-gray-1000">
          <SearchHitAuthor
            authorSlug={hit.authorSlug}
            authorDisplayName={hit.authorDisplayName}
            className="hover:opacity-70"
          />
        </Type>
        <Type style="bodySmall" As="span" className="text-gray-600">
          {hit.baseScore} karma
        </Type>
        <TimeAgo
          textStyle="bodySmall"
          As="span"
          time={hit.createdAt}
          className="text-gray-600"
          includeAgo
        />
      </div>
      <Link href={getCommentUrl(hit)} className="hover:opacity-70">
        <SearchSnippet hit={hit} field="body" fallback={hit.body} />
      </Link>
      {parent && (
        <Type style="bodySmall" className="text-gray-600">
          <Link
            href={getCommentUrl(hit, false)}
            className="text-gray-800 hover:text-gray-1000"
          >
            Comment
          </Link>{" "}
          on{" "}
          <Link href={parent.url} className="text-gray-800 hover:text-gray-1000">
            {parent.title}
          </Link>
        </Type>
      )}
    </article>
  );
}
