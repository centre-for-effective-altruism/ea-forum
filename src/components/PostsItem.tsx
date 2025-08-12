"use client";

import type { IFrontpagePostsList } from "@/lib/posts/postQueries.queries";
import { useClickableCell } from "@/lib/hooks/useClickableCell";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import {
  getPostReadTime,
  getPostSocialImageUrl,
  postGetPageUrl,
} from "@/lib/posts/postsHelpers";
import EllipsisVerticalIcon from "@heroicons/react/24/outline/EllipsisVerticalIcon";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import Image from "next/image";
import PostBody from "./PostBody";
import Tooltip from "./Tooltip";
import Type from "./Type";
import Score from "./Score";

export default function PostsItem({
  post,
  openInNewTab,
}: Readonly<{
  post: IFrontpagePostsList;
  openInNewTab?: boolean;
}>) {
  const {
    _id,
    title,
    baseScore,
    commentCount,
    voteCount,
    sticky,
    user,
    htmlHighlight,
  } = post;
  const postLink = postGetPageUrl({ post });
  const readTime = getPostReadTime(post);
  const imageUrl = getPostSocialImageUrl(post);
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
            <Tooltip
              placement="bottom-start"
              tooltipClassName="bg-white! text-black! p-0! shadow-md w-[330px]"
              title={
                <div>
                  <div className="p-2">
                    <Type style="postTitle">{title}</Type>
                    <PostBody html={htmlHighlight} />
                  </div>
                  {imageUrl && (
                    <div className="relative w-[330px] h-[60px] min-h-[60px]">
                      <Image src={imageUrl} alt={title} fill />
                    </div>
                  )}
                </div>
              }
            >
              <Type style="postTitle" className="text-black truncate">
                {title}
              </Type>
            </Tooltip>
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
