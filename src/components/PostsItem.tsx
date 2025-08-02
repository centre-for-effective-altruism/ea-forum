"use client";

import { useClickableCell } from "@/lib/useClickableCell";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import EllipsisVerticalIcon from "@heroicons/react/24/outline/EllipsisVerticalIcon";
import SoftArrowUpIcon from "./icons/SoftArrowUpIcon";
import Type from "./Type";

export default function PostsItem({ post, openInNewTab }: Readonly<{
  post: {
    _id: string,
    slug: string,
    title: string,
    baseScore: number,
    commentCount: number,
    isEvent?: boolean,
    groupId?: string | null,
  },
  openInNewTab?: boolean,
}>) {
  const {
    title,
    baseScore,
    commentCount,
  } = post;
  const postLink = postGetPageUrl({ post });
  const {onClick} = useClickableCell({href: postLink, openInNewTab});
  return (
    <article
      className={`
        w-[765px] h-[60px] max-w-full rounded bg-gray-50 border border-gray-100
        hover:bg-(--color-postitemhover) hover:border-(--color-postitemhover-border)
      `}
      data-component="PostsItem"
    >
      <div
        onClick={onClick}
        className="cursor-pointer w-full h-full flex gap-4 px-4 py-2 text-gray-600"
      >
        <div className="flex flex-col items-center justify-center gap-1">
          <SoftArrowUpIcon className="text-gray-400" />
          <Type style="bodySmall">{baseScore}</Type>
        </div>
        <div className="grow">
          <Type style="postTitle" className="text-black">{title}</Type>
        </div>
        <div className="flex items-center gap-1 hover:text-black">
          <ChatBubbleLeftIcon className="w-[18px]" />
          {commentCount}
        </div>
        <div className="flex items-center hover:text-black">
          <EllipsisVerticalIcon className="w-[20px]" />
        </div>
      </div>
    </article>
  );
}
