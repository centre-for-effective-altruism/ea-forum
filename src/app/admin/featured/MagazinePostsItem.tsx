"use client";

import { Fragment, useMemo } from "react";
import Image from "next/image";
import clsx from "clsx";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import StarIcon from "@heroicons/react/24/solid/StarIcon";
import type { PostListItem } from "@/lib/posts/postLists";
import { useItemsRead } from "@/lib/hooks/useItemsRead";
import {
  getPostPlaintextDescription,
  getPostReadTimeMinutes,
  postGetPageUrl,
} from "@/lib/posts/postsHelpers";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import PostIcons from "@/components/PostsList/PostIcons";
import SoftArrowUpIcon from "@/components/Icons/SoftArrowUpIcon";
import UsersName from "@/components/UsersName";
import TimeAgo from "@/components/TimeAgo";
import Type from "@/components/Type";
import Link from "@/components/Link";
import { getMagazinePostImageUrl } from "./magazinePostImages";

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
  const imageUrl = getMagazinePostImageUrl(post);
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
          "group relative flex flex-col",
          isRead
            ? "bg-primary/20 hover:bg-primary/30"
            : "bg-gray-50 hover:bg-gray-200",
        )}
      >
        <div
          className={clsx(
            "relative aspect-[16/9] w-full overflow-hidden group-hover:brightness-90 [.theme-dark_&]:group-hover:brightness-110",
            imageUrl
              ? "bg-gray-100"
              : "bg-gradient-to-br from-primary-light/20 to-primary-dark/30",
          )}
        >
          {imageUrl && (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(min-width: 1200px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          )}
          {post.curatedDate && (
            <div className="absolute right-0 top-0 z-[3] flex items-center gap-1 bg-curated-star px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-1000">
              <StarIcon className="w-3" />
              Curated
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
          <div className="line-clamp-2 font-serif text-[22px] font-normal leading-tight text-gray-1000">
            <span className="relative z-[2] inline-flex align-middle">
              <PostIcons post={post} side="left" />
            </span>
            <Link
              href={postLink}
              className="align-middle after:absolute after:inset-0 after:z-[1] after:content-['']"
            >
              {title}
            </Link>
          </div>
          {description && (
            <Type style="postDescription" className="line-clamp-2 text-gray-700">
              {description}
            </Type>
          )}
          <div className="mt-auto flex items-center justify-between gap-3">
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
            {commentCount > 0 && (
              <Link
                href={`${postLink}#comments`}
                className="relative z-[2] flex shrink-0 items-center gap-1 text-gray-800 hover:text-gray-1000"
              >
                <ChatBubbleLeftIcon className="w-[18px]" />
                <Type As="span" style="bodyHeavy">
                  {commentCount}
                </Type>
              </Link>
            )}
          </div>
        </div>
      </article>
    </AnalyticsContext>
  );
}
