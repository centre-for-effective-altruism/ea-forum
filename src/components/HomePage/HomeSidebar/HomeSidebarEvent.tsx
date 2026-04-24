import type { PostListItem } from "@/lib/posts/postLists";
import { getEventLocation, postGetPageUrl } from "@/lib/posts/postsHelpers";
import { formatShortDate } from "@/lib/timeUtils";
import PostsTooltip from "@/components/PostsTooltip";
import Type from "../../Type";
import Link from "../../Link";

export default function HomeSidebarEvent({
  post,
}: Readonly<{
  post: PostListItem;
}>) {
  const { title, startTime } = post;
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
          {startTime && <span className="mr-2">{formatShortDate(startTime)}</span>}
          {getEventLocation(post)}
        </Type>
      </Link>
    </PostsTooltip>
  );
}
