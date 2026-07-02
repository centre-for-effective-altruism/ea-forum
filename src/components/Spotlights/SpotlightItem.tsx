"use client";

import { useCallback, useState } from "react";
import clsx from "clsx";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { CookieName, HIDE_SPOTLIGHT_ITEM_PREFIX } from "@/lib/cookies/cookies";
import { useCookiesWithConsent } from "@/lib/cookies/useCookiesWithConsent";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import type {
  SpotlightDisplay,
  SpotlightSequencePost,
} from "@/lib/spotlights/spotlightHelpers";
import CloudinaryImage from "../CloudinaryImage";
import CommentBody from "../ContentStyles/CommentBody";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export type SpotlightItemData = Omit<SpotlightDisplay, "sequencePosts"> & {
  sequencePosts?: SpotlightSequencePost[];
};

/**
 * White boxes for the posts in a spotlighted sequence, filled when read.
 * Hovering shows the post title; clicking navigates to the post within the
 * sequence.
 */
function SequenceProgressBoxes({
  sequenceId,
  posts,
}: Readonly<{
  sequenceId: string;
  posts: SpotlightSequencePost[];
}>) {
  return (
    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
      {posts.map((post) => (
        <Tooltip
          key={post._id}
          title={
            <Type style="bodySmall" className="text-left">
              {post.title}
            </Type>
          }
        >
          <Link
            href={postGetPageUrl({ post, sequenceId })}
            className={clsx(
              "block h-3.5 w-3.5 rounded-[2px] border border-always-white/80",
              "transition-colors",
              post.isRead
                ? "bg-always-white"
                : "bg-always-white/10 hover:bg-always-white/60",
            )}
          >
            <span className="sr-only">{post.title}</span>
          </Link>
        </Tooltip>
      ))}
    </div>
  );
}

/**
 * A single spotlight: background image with an optional block color fading
 * into it, white title linking to the spotlighted post/sequence, rich text
 * description, and read-progress boxes for sequences. Also used by the admin
 * page to preview scheduled spotlights (with `dismissable` off).
 */
export default function SpotlightItem({
  spotlight,
  dismissable = false,
  className,
}: Readonly<{
  spotlight: SpotlightItemData;
  dismissable?: boolean;
  className?: string;
}>) {
  // Cast is safe: hide_spotlight_item_* cookies are registered via a `matches`
  // pattern in cookies.ts, since they include a dynamic spotlight id
  const cookieName = `${HIDE_SPOTLIGHT_ITEM_PREFIX}${spotlight._id}` as CookieName;
  const [hidden, setHidden] = useState(false);
  const [, setCookie] = useCookiesWithConsent([cookieName]);

  const onDismiss = useCallback(() => {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    setCookie(cookieName, "true", { path: "/", expires });
    setHidden(true);
  }, [cookieName, setCookie]);

  if (hidden) {
    return null;
  }

  const {
    _id,
    documentType,
    documentId,
    title,
    descriptionHtml,
    imageId,
    blockColor,
    showBlockColor,
    url,
    sequencePosts,
  } = spotlight;
  const showBlock = showBlockColor && !!blockColor;

  return (
    <AnalyticsContext pageElementContext="spotlightItem" spotlightId={_id}>
      <article
        data-component="SpotlightItem"
        className={clsx("relative overflow-hidden rounded-sm", className)}
      >
        <CloudinaryImage
          publicId={imageId}
          objectFit="cover"
          imgProps={{ w: "1560", h: "440" }}
          wrapperClassName="absolute inset-0"
          className="h-full w-full object-cover"
        />
        {showBlock && (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, ${blockColor} 0%, ${blockColor} 40%, transparent 75%)`,
            }}
          />
        )}
        <div
          className="
            relative flex min-h-[176px] max-w-[80%] flex-col items-start
            gap-1 p-6 sm:max-w-[65%]
          "
        >
          <Link href={url} className="hover:underline">
            <Type
              As="h2"
              style="sectionTitleLarge"
              className="text-always-white [text-shadow:0_1px_4px_rgba(0,0,0,0.4)]"
            >
              {title}
            </Type>
          </Link>
          {descriptionHtml && (
            <CommentBody
              html={descriptionHtml}
              className="
                text-always-white! text-[16px]! leading-snug
                [text-shadow:0_1px_4px_rgba(0,0,0,0.4)]
                [&_a]:text-always-white! [&_a]:underline
                [&_a:hover]:opacity-80
              "
            />
          )}
          {documentType === "Sequence" && !!sequencePosts?.length && (
            <SequenceProgressBoxes sequenceId={documentId} posts={sequencePosts} />
          )}
        </div>
        {dismissable && (
          <button
            onClick={onDismiss}
            aria-label="Hide this spotlight"
            className="
              absolute right-3 top-3 z-[2] cursor-pointer
              text-always-white/80 hover:text-always-white
            "
          >
            <XMarkIcon className="w-5" />
          </button>
        )}
      </article>
    </AnalyticsContext>
  );
}
