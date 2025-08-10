"use client";

import type { IFrontpagePostsList } from "@/lib/posts/postQueries.queries";
import { useClickableCell } from "@/lib/hooks/useClickableCell";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import EllipsisVerticalIcon from "@heroicons/react/24/outline/EllipsisVerticalIcon";
import SoftArrowUpIcon from "./icons/SoftArrowUpIcon";
import Type from "./Type";

export default function PostsItem({
  post,
  openInNewTab,
}: Readonly<{
  post: IFrontpagePostsList;
  openInNewTab?: boolean;
}>) {
  const { _id, title, baseScore, commentCount, sticky, user } = post;
  const postLink = postGetPageUrl({ post });
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
          w-[765px] h-[60px] max-w-full rounded bg-gray-50 border border-gray-100
          hover:bg-(--color-postitemhover) hover:border-(--color-postitemhover-border)
        `}
        data-component="PostsItem"
      >
        <div
          onClick={onClick}
          className={`
            cursor-pointer w-full h-full px-4 py-2 text-gray-600
            grid grid-cols-[min-content_1fr_min-content_min-content] gap-4
          `}
        >
          <div className="flex flex-col items-center justify-center gap-1 px-2">
            <SoftArrowUpIcon className="text-gray-400" />
            <Type style="bodySmall">{baseScore}</Type>
          </div>
          <div className="grow">
            <Type style="postTitle" className="text-black">
              {title}
            </Type>
            <div>{user.displayName}</div>
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
