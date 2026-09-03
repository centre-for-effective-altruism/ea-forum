"use client";

import { ReactNode, useCallback, useState } from "react";
import Image from "next/image";
import type { PostsListViewType } from "@/lib/posts/postsListView";
import type { PostListItem } from "@/lib/posts/postLists";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import { useHideRepeatedPosts } from "@/lib/hooks/useHideRepeatedPosts";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useItemsRead } from "@/lib/hooks/useItemsRead";
import { useHighlightTag } from "./useHighlightTag";
import {
  getPostPlaintextDescription,
  getPostSocialImageUrl,
  postGetPageUrl,
  postHasNewUnreadComments,
} from "@/lib/posts/postsHelpers";
import { hideBrokenImage } from "@/lib/utils/domHelpers";
import clsx from "clsx";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import PostTripleDotMenu from "../PostsPage/PostTripleDotMenu";
import PostsItemNewComments from "./PostsItemNewComments";
import PostsItemMeta from "./PostsItemMeta";
import PostsTooltip from "../PostsTooltip";
import TagChip from "../Tags/TagChip";
import PostIcons from "./PostIcons";
import Score from "../Score";
import Type from "../Type";
import Link from "../Link";

export default function PostsItem({
  post,
  viewType,
  openInNewTab,
  curatedIconLeft = false,
  underNode,
  className,
}: Readonly<{
  post: PostListItem;
  viewType?: PostsListViewType;
  openInNewTab?: boolean;
  curatedIconLeft?: boolean;
  underNode?: ReactNode;
  className?: string;
}>) {
  const cardView = viewType === "card";
  const { _id, title, baseScore, commentCount, voteCount, sticky, readStatus } =
    post;
  const postLink = postGetPageUrl({ post });
  const { postsRead } = useItemsRead();
  const { highlightTag } = useHighlightTag();
  const isRead = !!(post._id in postsRead
    ? postsRead[post._id]
    : readStatus?.[0]?.isRead);
  const { onClick } = useClickableCell({
    href: postLink,
    openInNewTab,
    ignoreLinks: true,
  });
  const description = cardView ? getPostPlaintextDescription(post) : null;
  const imageUrl = getPostSocialImageUrl(post, { width: 160, dpr: 2 });

  const [showNewComments, setShowNewComments] = useState(false);
  const [everShownNewComments, setEverShownNewComments] = useState(false);

  const toggleShowNewComments = useCallback(() => {
    setShowNewComments((value) => !value);
    setEverShownNewComments(true);
  }, []);

  const hasNewUnreadComments =
    !everShownNewComments && postHasNewUnreadComments(post);

  const { isPostRepeated, addPost } = useHideRepeatedPosts();
  const isRepeated = isPostRepeated(post._id);
  if (isRepeated) {
    return null;
  }
  addPost(post._id);

  const commentsNode =
    commentCount < 1 ? null : (
      <button
        onClick={toggleShowNewComments}
        className={clsx(
          "flex items-center gap-1 hover:text-gray-1000 cursor-pointer w-[44px] ml-5",
          hasNewUnreadComments ? "text-gray-900" : "text-gray-600",
        )}
      >
        <ChatBubbleLeftIcon className="w-[16px]" />
        <Type
          style="bodySmall"
          className={clsx(hasNewUnreadComments && "font-[600]!")}
        >
          {commentCount}
        </Type>
      </button>
    );

  return (
    <AnalyticsContext
      pageElementContext="postItem"
      viewType="list"
      postId={_id}
      isSticky={sticky}
    >
      <article
        data-component="PostsItem"
        className={clsx(
          "w-full max-w-full rounded bg-postitem",
          "flex flex-col hover:bg-postitemhover",
          cardView ? "justify-between" : "justify-center",
          className,
        )}
      >
        <div
          onClick={onClick}
          className={clsx(
            "cursor-pointer w-full max-w-full px-3 text-gray-600",
            "grid gap-3 grid-cols-[min-content_1fr]",
            "sm:grid-cols-[min-content_1fr_min-content_min-content]",
            cardView ? "items-start py-1" : "items-center py-[7px]",
          )}
        >
          <Score
            baseScore={baseScore}
            voteCount={voteCount}
            orientation="vertical"
            className={clsx("min-w-[24px] sm:min-w-[33px]", cardView && "mt-4")}
          />
          <div className={clsx("min-w-0 grow", cardView && "mt-1")}>
            <div className="min-w-0 flex gap-1">
              <Type
                style="postTitle"
                className={clsx(
                  "mb-0 min-w-0",
                  // On mobile the default 1.5 line-height looked loose / clipped
                  // descenders inside the line-clamp, so tighten it (keeping the
                  // postitem font size unchanged).
                  "max-sm:leading-[1.3]",
                  isRead ? "text-gray-700" : "text-gray-900",
                  cardView ? "line-clamp-2" : "max-sm:line-clamp-3 sm:truncate",
                )}
              >
                <InteractionWrapper As="span">
                  <PostIcons
                    post={post}
                    side="left"
                    curatedIconLeft={curatedIconLeft}
                    className="mr-1 translate-y-1"
                  />
                </InteractionWrapper>
                <PostsTooltip As="span" post={post}>
                  <Link
                    href={postLink}
                    className="align-middle visited:text-gray-600 hover:opacity-70"
                  >
                    {title}
                  </Link>
                </PostsTooltip>
                <InteractionWrapper As="span" className="max-sm:hidden">
                  <PostIcons
                    post={post}
                    side="right"
                    curatedIconLeft={curatedIconLeft}
                    className="ml-1 translate-y-1"
                  />
                </InteractionWrapper>
              </Type>
              {!!highlightTag &&
                post.tags?.some((tag) => tag._id === highlightTag._id) && (
                  <InteractionWrapper As="span" className="max-sm:hidden">
                    <TagChip
                      tag={highlightTag}
                      variant="small"
                      className="inline-block"
                    />
                  </InteractionWrapper>
                )}
            </div>
            <Type style="bodySmallMedium" className="min-w-0 flex">
              <PostsItemMeta post={post} />
              <InteractionWrapper className="sm:hidden">
                {commentsNode}
              </InteractionWrapper>
              <InteractionWrapper className="flex items-center sm:hidden">
                <PostTripleDotMenu post={post} />
              </InteractionWrapper>
            </Type>
          </div>
          <InteractionWrapper
            className={clsx("max-sm:hidden", cardView && "mt-[6px]")}
          >
            {commentsNode}
          </InteractionWrapper>
          <InteractionWrapper
            className={clsx(
              "flex items-center max-sm:hidden -ml-1",
              cardView && "mt-[6px]",
            )}
          >
            <PostTripleDotMenu post={post} />
          </InteractionWrapper>
        </div>
        {cardView && (
          <div
            className="
              flex gap-2 sm:gap-8 items-end pl-[48px] sm:pl-[57px] pr-5 pb-4 -mt-1
            "
          >
            <Type
              style="postDescription"
              className="
                text-gray-600 line-clamp-3 overflow-hidden grow leading-[165%]
              "
            >
              {description}
            </Type>
            {imageUrl && (
              <div
                className="
                  w-[100px] min-w-[100px] sm:w-[160px] sm:min-w-[160px]
                  overflow-hidden rounded relative h-[80px] min-h-[80px]
                "
              >
                <Image
                  src={imageUrl}
                  onError={hideBrokenImage}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        )}
        {showNewComments && (
          <InteractionWrapper>
            <PostsItemNewComments post={post} className="px-3 py-2" />
          </InteractionWrapper>
        )}
        {underNode}
      </article>
    </AnalyticsContext>
  );
}
