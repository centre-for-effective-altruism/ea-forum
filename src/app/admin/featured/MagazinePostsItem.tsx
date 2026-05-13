"use client";

import { Fragment, useMemo } from "react";
import Image from "next/image";
import clsx from "clsx";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import type { PostListItem } from "@/lib/posts/postLists";
import { useItemsRead } from "@/lib/hooks/useItemsRead";
import {
  getPostPlaintextDescription,
  getPostReadTimeMinutes,
  getPostSocialImageUrl,
  postGetPageUrl,
} from "@/lib/posts/postsHelpers";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import PostIcons from "@/components/PostsList/PostIcons";
import SoftArrowUpIcon from "@/components/Icons/SoftArrowUpIcon";
import UsersName from "@/components/UsersName";
import TimeAgo from "@/components/TimeAgo";
import Type from "@/components/Type";
import Link from "@/components/Link";

export default function MagazinePostsItem({
  post,
}: Readonly<{ post: PostListItem }>) {
  const {
    _id,
    title,
    baseScore,
    commentCount,
    user,
    coauthors,
    readStatus,
    postedAt,
  } = post;
  const postLink = postGetPageUrl({ post });
  const imageUrl = getPostSocialImageUrl(post);
  const description = useMemo(() => getPostPlaintextDescription(post), [post]);
  const readTime = getPostReadTimeMinutes(
    post.readTimeMinutesOverride,
    post.contents?.wordCount ?? null,
  );
  const { postsRead } = useItemsRead();
  const isRead = !!(_id in postsRead ? postsRead[_id] : readStatus?.[0]?.isRead);

  return (
    <AnalyticsContext pageElementContext="postItem" viewType="magazine" postId={_id}>
      <article
        data-component="MagazinePostsItem"
        className={clsx(
          "group relative flex flex-col overflow-hidden rounded",
          isRead
            ? "bg-primary/10 hover:bg-primary/20"
            : "bg-gray-50 hover:bg-postitemhover",
        )}
      >
        {imageUrl && (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover transition-opacity group-hover:opacity-90"
            />
          </div>
        )}
        <div className="flex flex-col gap-3 p-5">
          <Type
            style="postsPageTitle"
            className="line-clamp-3 text-[24px] leading-tight text-gray-1000 sm:text-[28px]"
          >
            <span className="relative z-[2] inline-flex align-middle">
              <PostIcons post={post} side="left" curatedIconLeft />
            </span>
            <Link
              href={postLink}
              className="align-middle after:absolute after:inset-0 after:z-[1] after:content-['']"
            >
              {title}
            </Link>
          </Type>
          {description && (
            <Type style="postDescription" className="line-clamp-3 text-gray-700">
              {description}
            </Type>
          )}
          <div className="mt-1 flex items-center justify-between gap-3">
            <Type
              style="bodySmall"
              className="flex min-w-0 items-center gap-1 text-gray-800"
            >
              <SoftArrowUpIcon className="shrink-0 text-gray-600" />
              <span className="shrink-0">{baseScore}</span>
              <span className="min-w-0 truncate">
                <span className="px-1">·</span>
                <UsersName user={user} className="relative z-[2] hover:underline" />
                {coauthors?.map((coauthor) => (
                  <Fragment key={coauthor._id}>
                    <span>, </span>
                    <UsersName
                      user={coauthor}
                      className="relative z-[2] hover:underline"
                    />
                  </Fragment>
                ))}
                <span className="px-1">·</span>
                <TimeAgo
                  As="span"
                  textStyle="bodySmall"
                  time={postedAt}
                  tooltipPrefix="Posted on "
                  includeAgo
                />
                <span className="px-1">·</span>
                <span>{readTime}m read</span>
              </span>
            </Type>
            <Link
              href={`${postLink}#comments`}
              className="relative z-[2] flex shrink-0 items-center gap-1 text-gray-800 hover:text-gray-1000"
            >
              <ChatBubbleLeftIcon className="w-[18px]" />
              <Type As="span" style="bodyHeavy">
                {commentCount}
              </Type>
            </Link>
          </div>
        </div>
      </article>
    </AnalyticsContext>
  );
}
