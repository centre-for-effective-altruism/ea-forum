import type { FC, ReactNode, SyntheticEvent } from "react";
import { PostListItem } from "@/lib/posts/postLists";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import {
  getPostSocialImageUrl,
  postGetPageUrl,
  postHasNewUnreadComments,
} from "@/lib/posts/postsHelpers";
import clsx from "clsx";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import StarIcon from "@heroicons/react/24/solid/StarIcon";
import PostsItemMeta from "../PostsList/PostsItemMeta";
import LotusIcon from "../Icons/LotusIcon";
import Image from "next/image";
import Type from "../Type";
import Link from "../Link";

const defaultImageUrl =
  "https://res.cloudinary.com/cea/image/upload/v1582740871/EA_Forum_OG_Image.png";

/**
 * If an image fails to load some browsers show an ugly white border that
 * we should hide
 */
const onImageError = (ev: SyntheticEvent<HTMLImageElement, Event>) => {
  (ev.target as HTMLImageElement).style.visibility = "hidden";
};

const Chip: FC<{ className: string; children: ReactNode }> = ({
  className,
  children,
}) => (
  <Type
    style="bodyHeavy"
    className={clsx(
      "border-1 rounded-[3px] text-always-black px-1.5 py-px shadow-sm",
      "flex items-center gap-1",
      className,
    )}
  >
    {children}
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
  const { _id, title, curatedDate, tags, commentCount } = post;

  const hasUnreadComments = postHasNewUnreadComments(post);
  const href = postGetPageUrl({ post });
  const isCommunity = process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID
    ? !!tags?.some(({ _id }) => _id === process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID)
    : false;
  const imageUrl = getPostSocialImageUrl(post, { width: 250, dpr: "auto" });

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
      <article
        data-component="FeaturedPost"
        onClick={onClick}
        className={clsx(
          "cursor-pointer flex flex-col gap-3 p-5 rounded border-1 border-gray-200",
          "bg-surface-floating hover:bg-surface-floating-hover",
          className,
        )}
      >
        <div
          className={clsx(
            "relative overflow-hidden rounded relative border-1 border-gray-600",
            "w-full grow min-h-[140px]",
          )}
        >
          <Image
            src={imageUrl || defaultImageUrl}
            onError={onImageError}
            alt=""
            fill
            className="object-cover"
          />
          <div className="absolute z-1 top-3 right-4 flex flex-col gap-1">
            {curatedDate && (
              <Chip className="bg-post-curated-bg border-post-curated-border">
                <StarIcon className="w-3.5" />
                Curated
              </Chip>
            )}
            {isCommunity && (
              <Chip className="bg-post-community-bg border-post-community-border">
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
          <InteractionWrapper>
            <Link
              href={href + "#comments"}
              className="
                flex items-center gap-1 hover:bg-gray-200 rounded-[3px] px-1 py-0.5
              "
            >
              <ChatBubbleLeftIcon className="w-4" />
              <Type
                style="bodySmall"
                className={clsx(hasUnreadComments && "font-[600]!")}
              >
                {commentCount}
              </Type>
            </Link>
          </InteractionWrapper>
        </Type>
      </article>
    </AnalyticsContext>
  );
}
