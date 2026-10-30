import type {
  SearchComment,
  SearchDocument,
  SearchPost,
  SearchSequence,
  SearchTag,
  SearchUser,
} from "@/lib/search/searchDocuments";
import type { SearchContentType } from "@/lib/search/searchPageParams";
import SearchPostHit from "./SearchPostHit";
import SearchCommentHit from "./SearchCommentHit";
import SearchTagHit from "./SearchTagHit";
import SearchSequenceHit from "./SearchSequenceHit";
import SearchUserHit from "./SearchUserHit";

export default function SearchHit({
  contentType,
  hit,
}: Readonly<{
  contentType: SearchContentType;
  hit: SearchDocument;
}>) {
  switch (contentType) {
    case "Posts":
      return <SearchPostHit hit={hit as SearchPost} />;
    case "Comments":
      return <SearchCommentHit hit={hit as SearchComment} />;
    case "Tags":
      return <SearchTagHit hit={hit as SearchTag} />;
    case "Sequences":
      return <SearchSequenceHit hit={hit as SearchSequence} />;
    case "Users":
      return <SearchUserHit hit={hit as SearchUser} />;
  }
}
