import type { SearchPost } from "@/lib/search/searchDocuments";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import DocumentIcon from "@heroicons/react/24/solid/DocumentIcon";
import HeaderSearchResult from "./HeaderSearchResult";
import TimeAgo from "../TimeAgo";
import Type from "../Type";

export default function HeaderSearchPost({
  post,
}: Readonly<{
  post: SearchPost;
}>) {
  return (
    <HeaderSearchResult
      tooltipTitle="Post"
      href={postGetPageUrl({ post })}
      Icon={DocumentIcon}
    >
      <div>
        <Type style="postTitle">{post.title}</Type>
        <div className="flex gap-2">
          <span>{post.authorDisplayName}</span>
          <TimeAgo textStyle="bodySmall" As="span" time={post.postedAt} />
          <span>{post.baseScore} karma</span>
        </div>
        <div className="line-clamp-2">{post.body}</div>
      </div>
    </HeaderSearchResult>
  );
}
