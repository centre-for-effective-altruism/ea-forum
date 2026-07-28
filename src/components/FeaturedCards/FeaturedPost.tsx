import type { FC, ReactNode, SyntheticEvent } from "react";
import { PostListItem } from "@/lib/posts/postLists";
import { useItemsRead } from "@/lib/hooks/useItemsRead";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useClickableCell } from "@/lib/hooks/useClickableCell";
import {
  getPostSocialImageUrlWithDefaultBackup,
  postGetPageUrl,
  postHasNewUnreadComments,
} from "@/lib/posts/postsHelpers";
import clsx from "clsx";
import ChatBubbleOutlineIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import ChatBubbleSolidIcon from "@heroicons/react/24/solid/ChatBubbleLeftIcon";
import StarIcon from "@heroicons/react/24/solid/StarIcon";
import PostsItemMeta from "../PostsList/PostsItemMeta";
import PostsTooltip from "../PostsTooltip";
import LotusIcon from "../Icons/LotusIcon";
import Image from "next/image";
import Type from "../Type";
import Link from "../Link";

/**
 * If an image fails to load some browsers show an ugly white border that
 * we should hide
 */
const onImageError = (ev: SyntheticEvent<HTMLImageElement, Event>) => {
  (ev.target as HTMLImageElement).style.visibility = "hidden";
};

const Chip: FC<{ href: string; className: string; children: ReactNode }> = ({
  href,
  className,
  children,
}) => (
  <Type style="bodyHeavy">
    <Link
      href={href}
      className={clsx(
        "border-1 rounded-[3px] text-always-black px-1.5 py-px shadow-sm",
        "flex items-center gap-1 hover:scale-104 transition-all",
        className,
      )}
    >
      {children}
    </Link>
  </Type>
);

export default function FeaturedPost({
  post,
  large,
  className,
}: Readonly<{
  post: PostListItem;
  large?: boolean;
  className?: string;
}>) {
  const { currentUser } = useCurrentUser();
  const { postsRead } = useItemsRead();
  const { _id, title, curatedDate, tags, commentCount } = post;

  const isNew =
    post._id in postsRead
      ? !postsRead[post._id]
      : !!currentUser && !post.readStatus?.[0]?.isRead;
  const hasUnreadComments = postHasNewUnreadComments(post);
  const href = postGetPageUrl({ post });
  const isCommunity = process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID
    ? !!tags?.some(({ _id }) => _id === process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID)
    : false;
  const imageUrl = getPostSocialImageUrlWithDefaultBackup(post, {
    width: large ? 700 : 450,
    dpr: "auto",
  });

  const ChatIcon = isNew ? ChatBubbleSolidIcon : ChatBubbleOutlineIcon;

  const { onClick } = useClickableCell({
    href,
    ignoreLinks: true,
  });

  return (
    <AnalyticsContext
      pageElementContext="featuredPost"
      viewType={large ? "large" : "small"}
      postId={_id}
    >
      <PostsTooltip post={post} placement="right-start" className={className}>
        <article
          data-component="FeaturedPost"
          onClick={onClick}
          className="
            cursor-pointer flex flex-col gap-3 p-5 rounded border-1 border-gray-200
            relative bg-surface-floating hover:bg-surface-floating-hover h-full
          "
        >
          {isNew && (
            <div className="absolute -inset-y-px -left-px w-1.5 bg-primary rounded-l" />
          )}
          <div
            className={clsx(
              "relative overflow-hidden rounded relative w-full grow min-h-[140px]",
              "border-1 border-gray-600/20",
            )}
          >
            <Image
              src={imageUrl}
              onError={onImageError}
              alt=""
              fill
              className="object-cover"
            />
            <div className="absolute z-1 top-3 right-4 flex flex-col gap-1">
              {curatedDate && (
                <Chip
                  href="/recommendations"
                  className="bg-post-curated-bg border-post-curated-border"
                >
                  <StarIcon className="w-3.5" />
                  Curated
                </Chip>
              )}
              {isCommunity && (
                <Chip
                  href="/topics/community"
                  className="bg-post-community-bg border-post-community-border"
                >
                  <LotusIcon className="w-3.5" />
                  Community
                </Chip>
              )}
            </div>
          </div>
          <Type
            style={large ? "featuredPostTitleLarge" : "featuredPostTitle"}
            className="line-clamp-3"
          >
            {title}
          </Type>
          <Type style="bodySmallMedium" className="min-w-0 flex items-center gap-2">
            <PostsItemMeta post={post} hideCuratedDate />
            {commentCount > 0 && (
              <Link
                href={href + "#comments"}
                className={clsx(
                  "flex items-center gap-1 hover:bg-gray-200",
                  "rounded-[3px] px-1 py-0.5",
                  isNew && "text-primary",
                )}
              >
                <ChatIcon className="w-4" />
                <Type
                  style="bodySmall"
                  className={clsx(hasUnreadComments && "font-[600]!")}
                >
                  {commentCount}
                </Type>
              </Link>
            )}
          </Type>
        </article>
      </PostsTooltip>
    </AnalyticsContext>
  );
}
