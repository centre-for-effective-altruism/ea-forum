"use client";

import type { IFrontpagePostsList } from "@/lib/posts/postQueries.schemas";
import { useClickableCell } from "@/lib/hooks/useClickableCell";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getPostReadTime, postGetPageUrl } from "@/lib/posts/postsHelpers";
import EllipsisVerticalIcon from "@heroicons/react/24/outline/EllipsisVerticalIcon";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import PostsTooltip from "./PostsTooltip";
import Type from "./Type";
import Score from "./Score";

export default function PostsItem({
  post,
  openInNewTab,
}: Readonly<{
  post: IFrontpagePostsList;
  openInNewTab?: boolean;
}>) {
  const { _id, title, baseScore, commentCount, voteCount, sticky, user } = post;
  const postLink = postGetPageUrl({ post });
  const readTime = getPostReadTime(post);
  const { onClick } = useClickableCell({ href: postLink, openInNewTab });
  return (
    <AnalyticsContext
      pageElementContext="postItem"
      viewType="list"
      postId={_id}
      isSticky={sticky}
    >
      <article
        className={`
          w-full max-w-full h-[60px] rounded bg-gray-50 border border-gray-100
          hover:bg-(--color-postitemhover) hover:border-(--color-postitemhover-border)
        `}
        data-component="PostsItem"
      >
        <div
          onClick={onClick}
          className={`
            cursor-pointer w-full max-w-full h-full px-4 py-2 text-gray-600
            grid grid-cols-[min-content_1fr_min-content_min-content] gap-4
          `}
        >
          <Score baseScore={baseScore} voteCount={voteCount} orient="vertical" />
          <div className="truncate">
            <PostsTooltip post={post}>
              <Type style="postTitle" className="text-black truncate">
                {title}
              </Type>
            </PostsTooltip>
            <Type style="bodySmall">
              {user.displayName}
              {" · "}
              {readTime}m read
            </Type>
          </div>
          <div className="flex items-center gap-1 hover:text-black">
            <ChatBubbleLeftIcon className="w-[18px]" />
            <Type>{commentCount}</Type>
          </div>
          <div className="flex items-center hover:text-black">
            <EllipsisVerticalIcon className="w-[20px]" />
          </div>
        </div>
      </article>
    </AnalyticsContext>
  );
}
