import type { PostListItem } from "@/lib/posts/postLists";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { formatRelativeTime } from "@/lib/timeUtils";
import PostsTooltip from "@/components/PostsTooltip";
import Type from "../../Type";
import Link from "../../Link";

export default function HomeSidebarPost({
  post,
}: Readonly<{
  post: PostListItem;
}>) {
  const { title, postedAt } = post;
  const pageUrl = postGetPageUrl({ post });
  return (
    <PostsTooltip post={post} placement="left-start">
      <Link
        href={pageUrl}
        className="block py-1 hover:opacity-70"
        data-component="HomeSidebarPost"
      >
        <Type style="bodySmall" className="font-[600] truncate">
          {title}
        </Type>
        <Type style="bodySmall" className="text-gray-600">
          Posted {formatRelativeTime(postedAt)}
        </Type>
      </Link>
    </PostsTooltip>
  );
}
