"use client";

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
} from "@/lib/posts/postsHelpers";
import clsx from "clsx";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import PostTripleDotMenu from "../PostsPage/PostTripleDotMenu";
import TruncationContainer from "../TruncationContainer";
import PostsTooltip from "../PostsTooltip";
import UsersName from "../UsersName";
import PostIcons from "./PostIcons";
import TimeAgo from "../TimeAgo";
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
  const imageUrl = getPostSocialImageUrl(post);

  const { isPostRepeated, addPost } = useHideRepeatedPosts();
  const isRepeated = isPostRepeated(post._id);
  if (isRepeated) {
    return null;
  }
  addPost(post._id);

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
          "w-full max-w-full rounded bg-gray-50 border border-gray-100",
          "flex flex-col justify-between hover:bg-postitemhover",
          "hover:border-postitemhover-border",
          !cardView && "md:h-[60px]",
        )}
      >
        <div
          onClick={onClick}
          className={clsx(
            "cursor-pointer w-full max-w-full px-3 py-2 text-gray-600",
            "grid gap-3 grid-cols-[min-content_1fr]",
            "md:grid-cols-[min-content_1fr_min-content_min-content]",
            cardView ? "items-start" : "items-center",
          )}
        >
          <Score
            baseScore={baseScore}
            voteCount={voteCount}
            orientation="vertical"
            className={clsx("min-w-[24px] md:min-w-[33px]", cardView && "mt-[10px]")}
          />
          <div className={clsx("min-w-0 grow", cardView && "mt-1")}>
            <Type
              style="postTitle"
              className={clsx(
                "mb-[2px] max-md:line-clamp-2 md:truncate",
                "visited:text-grey-700 hover:opacity-70",
                isRead ? "text-grey-700" : "text-grey-900",
              )}
            >
              <InteractionWrapper className="inline">
                <PostIcons post={post} />
              </InteractionWrapper>
              <PostsTooltip As="span" post={post}>
                {/* Adding an empty class here removes the default hover styles */}
                <Link href={postLink} className="">
                  {title}
                </Link>
              </PostsTooltip>
            </Type>
            <Type style="bodySmall" className="min-w-0 flex">
              <InteractionWrapper className="grow">
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
                  afterNodeTextStyle="bodySmall"
                  afterNodeFormat={formatPostItemHiddenAuthors}
                  finalNode={
                    <>
                      <span className="px-1">·</span>
                      <TimeAgo
                        As="span"
                        textStyle="bodySmall"
                        time={post.postedAt}
                        tooltipPrefix="Posted on "
                        includeAgo
                      />
                      {post.curatedDate && (
                        <span className="max-md:hidden">
                          <span className="px-1">·</span>
                          <span>Curated </span>
                          <TimeAgo
                            As="span"
                            textStyle="bodySmall"
                            time={post.curatedDate}
                            tooltipPrefix="Curated on "
                            includeAgo
                          />
                        </span>
                      )}
                      <span className="max-md:hidden">
                        <span className="px-1">·</span>
                        <span>{readTime}m read</span>
                      </span>
                    </>
                  }
                />
              </InteractionWrapper>
              <InteractionWrapper className="md:hidden">
                <button
                  className="
                    flex items-center gap-1 hover:text-gray-1000 cursor-pointer
                    w-[44px] ml-5
                  "
                >
                  <ChatBubbleLeftIcon className="w-[16px]" />
                  <Type style="bodySmall">{commentCount}</Type>
                </button>
              </InteractionWrapper>
              <InteractionWrapper className="flex items-center md:hidden">
                <PostTripleDotMenu post={post} orientation="vertical" />
              </InteractionWrapper>
            </Type>
          </div>
          <InteractionWrapper className="max-md:hidden">
            <button
              className={clsx(
                "flex items-center gap-1 hover:text-gray-1000 cursor-pointer",
                cardView && "mt-1 mr-2",
              )}
            >
              <ChatBubbleLeftIcon className="w-[18px]" />
              <Type>{commentCount}</Type>
            </button>
          </InteractionWrapper>
          <InteractionWrapper className="flex items-center max-md:hidden">
            <PostTripleDotMenu post={post} orientation="vertical" />
          </InteractionWrapper>
        </div>
        {cardView && (
          <div className="flex gap-8 items-end pl-[56px] pr-5 pb-4">
            <Type
              style="postDescription"
              className="text-gray-600 line-clamp-3 overflow-hidden"
            >
              {description}
            </Type>
            <div
              className={clsx(
                "w-[100px] min-w-[100px] md:w-[160px] md:min-w-[160px]",
                "overflow-hidden rounded relative",
                imageUrl && "h-[80px] min-h-[80px]",
              )}
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
