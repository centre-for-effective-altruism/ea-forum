"use client";

import type { PostListItem } from "@/lib/posts/postLists";
import { useClickableCell } from "@/lib/hooks/useClickableCell";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getPostReadTime, postGetPageUrl } from "@/lib/posts/postsHelpers";
import EllipsisVerticalIcon from "@heroicons/react/24/outline/EllipsisVerticalIcon";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import PostsTooltip from "../PostsTooltip";
import UsersTooltip from "../UsersTooltip";
import Score from "../Score";
import Type from "../Type";
import Link from "../Link";

export default function PostsItem({
  post,
  openInNewTab,
}: Readonly<{
  post: PostListItem;
  openInNewTab?: boolean;
}>) {
  const { _id, title, baseScore, commentCount, voteCount, sticky, user } = post;
  const postLink = postGetPageUrl({ post });
  const readTime = getPostReadTime(
    post.readTimeMinutesOverride,
    post.contents?.wordCount ?? null,
  );
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
            cursor-pointer w-full max-w-full h-full px-3 py-2 text-gray-600
            grid grid-cols-[min-content_1fr_min-content_min-content] gap-3
          `}
        >
          <Score
            baseScore={baseScore}
            voteCount={voteCount}
            orient="vertical"
            className="min-w-[33px]"
          />
          <div className="truncate">
            <Type style="postTitle" className="text-black truncate">
              <PostsTooltip As="span" post={post}>
                <Link href={postLink}>{title}</Link>
              </PostsTooltip>
            </Type>
            <Type style="bodySmall">
              <UsersTooltip As="span" user={user}>
                {user?.displayName ?? "[Anonymous]"}
              </UsersTooltip>
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
