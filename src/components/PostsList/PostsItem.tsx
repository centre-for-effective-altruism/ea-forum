"use client";

import { SyntheticEvent, useCallback, useState } from "react";
import Image from "next/image";
import type { PostListItem } from "@/lib/posts/postLists";
import type { PostsListViewType } from "@/lib/posts/postsListView";
import { formatPostItemHiddenAuthors } from "@/lib/formatHelpers";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import { useHideRepeatedPosts } from "@/lib/hooks/useHideRepeatedPosts";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useItemsRead } from "@/lib/hooks/useItemsRead";
import {
  getPostPlaintextDescription,
  getPostReadTimeMinutes,
  getPostSocialImageUrl,
  postGetPageUrl,
  postHasNewUnreadComments,
} from "@/lib/posts/postsHelpers";
import clsx from "clsx";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import PostTripleDotMenu from "../PostsPage/PostTripleDotMenu";
import PostsItemNewComments from "./PostsItemNewComments";
import TruncationContainer from "../TruncationContainer";
import PostsTooltip from "../PostsTooltip";
import UsersName from "../UsersName";
import PostIcons from "./PostIcons";
import TimeAgo from "../TimeAgo";
import Score from "../Score";
import Type from "../Type";
import Link from "../Link";

/**
 * If an image fails to load some browsers show an ugly white border that
 * we should hide
 */
const onImageError = (ev: SyntheticEvent<HTMLImageElement, Event>) => {
  (ev.target as HTMLImageElement).style.visibility = "hidden";
};

export default function PostsItem({
  post,
  viewType,
  openInNewTab,
  curatedIconLeft = false,
  className,
}: Readonly<{
  post: PostListItem;
  viewType?: PostsListViewType;
  openInNewTab?: boolean;
  curatedIconLeft?: boolean;
  className?: string;
}>) {
  const cardView = viewType === "card";
  const {
    _id,
    title,
    baseScore,
    commentCount,
    voteCount,
    sticky,
    user,
    coauthors,
    readStatus,
  } = post;
  const postLink = postGetPageUrl({ post });
  const readTime = getPostReadTimeMinutes(
    post.readTimeMinutesOverride,
    post.contents?.wordCount ?? null,
  );
  const { postsRead } = useItemsRead();
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

  const commentsNode = (
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
          "w-full max-w-full rounded bg-gray-50",
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
            <Type
              style="postTitle"
              className={clsx(
                "mb-0 min-w-0",
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
            <Type style="bodySmallMedium" className="min-w-0 flex">
              <InteractionWrapper className="grow min-w-0">
                <TruncationContainer
                  items={[
                    <UsersName key="author" user={user} />,
                    ...(coauthors ?? []).map((coauthor) => (
                      <span key={coauthor._id}>
                        <span className="coauthor-comma">, </span>
                        <UsersName user={coauthor} />
                      </span>
                    )),
                  ]}
                  tooltipClassName="[&_.coauthor-comma]:hidden"
                  gap={0}
                  hiddenItemsTooltip
                  afterNodeTextStyle="bodySmallMedium"
                  afterNodeFormat={formatPostItemHiddenAuthors}
                  finalNode={
                    <>
                      <span className="px-1">·</span>
                      <TimeAgo
                        As="span"
                        textStyle="bodySmallMedium"
                        time={post.postedAt}
                        tooltipPrefix="Posted on "
                        includeAgo
                      />
                      {post.curatedDate && (
                        <span className="max-sm:hidden">
                          <span className="px-1">·</span>
                          <span>Curated </span>
                          <TimeAgo
                            As="span"
                            textStyle="bodySmallMedium"
                            time={post.curatedDate}
                            tooltipPrefix="Curated on "
                            includeAgo
                          />
                        </span>
                      )}
                      <span className="max-sm:hidden">
                        <span className="px-1">·</span>
                        <span>{readTime}m read</span>
                      </span>
                    </>
                  }
                />
              </InteractionWrapper>
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
          <div className="flex gap-2 sm:gap-8 items-end pl-[56px] pr-5 pb-4 -mt-1">
            <Type
              style="postDescription"
              className="text-gray-600 line-clamp-3 overflow-hidden grow leading-[165%]"
            >
              {description}
            </Type>
            <div
              className="
                w-[100px] min-w-[100px] sm:w-[160px] sm:min-w-[160px]
                overflow-hidden rounded relative h-[80px] min-h-[80px]
              "
            >
              {imageUrl && (
                <Image
                  src={imageUrl}
                  onError={onImageError}
                  alt=""
                  fill
                  className="object-cover"
                />
              )}
            </div>
          </div>
        )}
        {showNewComments && (
          <InteractionWrapper>
            <PostsItemNewComments post={post} className="px-3 py-2" />
          </InteractionWrapper>
        )}
      </article>
    </AnalyticsContext>
  );
}
