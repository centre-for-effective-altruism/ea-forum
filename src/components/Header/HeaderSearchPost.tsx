import type { SearchPost } from "@/lib/search/searchDocuments";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import DocumentIcon from "@heroicons/react/24/outline/DocumentIcon";
import HeaderSearchResult from "./HeaderSearchResult";
import TimeAgo from "../TimeAgo";
import Type from "../Type";

export default function HeaderSearchPost({
  post,
  selected,
}: Readonly<{
  post: SearchPost;
  selected?: boolean;
}>) {
  return (
    <HeaderSearchResult
      selected={selected}
      href={postGetPageUrl({ post })}
      Icon={DocumentIcon}
    >
      <div>
        <Type style="postTitle" className="text-gray-800">
          {post.title}
        </Type>
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
