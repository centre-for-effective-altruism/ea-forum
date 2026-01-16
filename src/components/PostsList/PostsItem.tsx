"use client";

import Image from "next/image";
import type { PostListItem } from "@/lib/posts/postLists";
import type { PostsListViewType } from "@/lib/posts/postsListView";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import {
  getPostPlaintextDescription,
  getPostReadTimeMinutes,
  getPostSocialImageUrl,
  postGetPageUrl,
} from "@/lib/posts/postsHelpers";
import clsx from "clsx";
import EllipsisVerticalIcon from "@heroicons/react/24/outline/EllipsisVerticalIcon";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import PostsTooltip from "../PostsTooltip";
import UsersTooltip from "../UsersTooltip";
import PostIcons from "./PostIcons";
import Score from "../Score";
import Type from "../Type";
import Link from "../Link";

export default function PostsItem({
  post,
  viewType,
  openInNewTab,
}: Readonly<{
  post: PostListItem;
  viewType?: PostsListViewType;
  openInNewTab?: boolean;
}>) {
  const cardView = viewType === "card";
  const { _id, title, baseScore, commentCount, voteCount, sticky, user } = post;
  const postLink = postGetPageUrl({ post });
  const readTime = getPostReadTimeMinutes(
    post.readTimeMinutesOverride,
    post.contents?.wordCount ?? null,
  );
  const { onClick } = useClickableCell({
    href: postLink,
    openInNewTab,
    ignoreLinks: true,
  });
  const description = cardView ? getPostPlaintextDescription(post) : null;
  const imageUrl = getPostSocialImageUrl(post);
  return (
    <AnalyticsContext
      pageElementContext="postItem"
      viewType="list"
      postId={_id}
      isSticky={sticky}
    >
      <article
        className={clsx(
          "w-full max-w-full rounded bg-gray-50 border border-gray-100",
          "flex flex-col justify-between hover:bg-(--color-postitemhover)",
          "hover:border-(--color-postitemhover-border)",
          cardView ? "h-[144px]" : "h-[60px]",
        )}
        data-component="PostsItem"
      >
        <div
          onClick={onClick}
          className={clsx(
            "cursor-pointer w-full max-w-full px-3 py-2 text-gray-600",
            "grid grid-cols-[min-content_1fr_min-content_min-content] gap-3",
            cardView ? "items-start" : "items-center",
          )}
        >
          <Score
            baseScore={baseScore}
            voteCount={voteCount}
            orient="vertical"
            className={clsx("min-w-[33px]", cardView && "mt-[10px]")}
          />
          <div className={clsx("truncate", cardView && "mt-1")}>
            <div className="flex items-center">
              <InteractionWrapper>
                <PostIcons post={post} />
              </InteractionWrapper>
              <Type style="postTitle" className="text-black truncate">
                <PostsTooltip As="span" post={post}>
                  <Link
                    href={postLink}
                    className="visited:text-gray-700 hover:opacity-60"
                  >
                    {title}
                  </Link>
                </PostsTooltip>
              </Type>
            </div>
            <Type style="bodySmall">
              <UsersTooltip As="span" user={user}>
                {user?.displayName ?? "[Anonymous]"}
              </UsersTooltip>
              {" · "}
              {readTime}m read
            </Type>
          </div>
          <div
            className={clsx(
              "flex items-center gap-1 hover:text-black",
              cardView && "mt-1 mr-2",
            )}
          >
            <ChatBubbleLeftIcon className="w-[18px]" />
            <Type>{commentCount}</Type>
          </div>
          <EllipsisVerticalIcon
            className={clsx("w-[20px] hover:text-black", cardView && "mt-1")}
          />
        </div>
        {cardView && (
          <div className="flex gap-8 items-end pl-[56px] pr-5 pb-4 -mt-4">
            <Type
              style="postDescription"
              className="text-gray-600 line-clamp-3 overflow-hidden"
            >
              {description}
            </Type>
            <div
              className="
                w-[160px] min-w-[160px] h-[80px] min-h-[80px] overflow-hidden
                rounded relative
              "
            >
              {imageUrl && (
                <Image src={imageUrl} alt="" fill className="object-cover" />
              )}
            </div>
          </div>
        )}
      </article>
    </AnalyticsContext>
  );
}
