"use client";

import { Fragment, SyntheticEvent } from "react";
import Image from "next/image";
import type { SequenceEventPost } from "@/lib/posts/postLists";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import { useItemsRead } from "@/lib/hooks/useItemsRead";
import {
  getPostPlaintextDescription,
  getPostSocialImageUrl,
  postGetPageUrl,
} from "@/lib/posts/postsHelpers";
import clsx from "clsx";
import UsersName from "../UsersName";
import Link from "../Link";
import Type from "../Type";

const PLACEHOLDER_IMAGE_URL =
  "https://res.cloudinary.com/cea/image/upload/v1761927213/ForumImagePlaceholder.jpg";

/**
 * If an image fails to load some browsers show an ugly white border that
 * we should hide
 */
const onImageError = (ev: SyntheticEvent<HTMLImageElement, Event>) => {
  (ev.target as HTMLImageElement).style.visibility = "hidden";
};

export default function SequenceEventCard({
  post,
}: Readonly<{
  post: SequenceEventPost;
}>) {
  const { postsRead } = useItemsRead();
  const href = postGetPageUrl({ post });
  const { onClick } = useClickableCell({ href });

  const isRead = !!(post._id in postsRead
    ? postsRead[post._id]
    : post.readStatus?.[0]?.isRead);
  const imageUrl =
    getPostSocialImageUrl(post, { width: 500, dpr: 2 }) ?? PLACEHOLDER_IMAGE_URL;

  return (
    <article
      data-component="SequenceEventCard"
      onClick={onClick}
      className={clsx(
        `
          group p-10 max-[600px]:p-5 flex gap-8 cursor-pointer
          pointer-fine:hover:bg-[var(--sequence-hover)]!
          pointer-fine:hover:text-[var(--sequence-theme)]
        `,
        isRead ? "bg-[var(--sequence-theme)]" : "bg-always-white",
      )}
    >
      <div className="flex flex-col gap-4">
        <Image
          src={imageUrl}
          onError={onImageError}
          alt={post.title}
          width={500}
          height={216}
          className="
            w-full h-[216px] max-[700px]:h-auto object-cover
            transition-transform duration-200 ease-in-out
            pointer-fine:group-hover:scale-[1.02]
          "
        />
        <InteractionWrapper>
          <Type As="h2" style="sequenceEventCardTitle">
            <Link href={href} className="hover:opacity-100">
              {post.title}
            </Link>
          </Type>
        </InteractionWrapper>
        <Type
          style="bodyLarge"
          className="tracking-[-0.01em] leading-[140%] line-clamp-3"
        >
          {getPostPlaintextDescription(post)}
        </Type>
        <Type style="sequenceEventAuthors">
          by{" "}
          <InteractionWrapper className="inline">
            <UsersName user={post.user} tooltipPlacement="bottom-start" />
          </InteractionWrapper>
          {post.coauthors?.map((user) => (
            <Fragment key={user._id}>
              {", "}
              <InteractionWrapper className="inline">
                <UsersName user={user} tooltipPlacement="bottom-start" />
              </InteractionWrapper>
            </Fragment>
          ))}
        </Type>
      </div>
      {post.marginalFundingOrg && (
        <div>
          <Type
            style="sequenceEventOrg"
            className="
              whitespace-nowrap [writing-mode:vertical-rl] [text-orientation:mixed]
              border border-[var(--sequence-text)] rounded-[26px] px-0.5 py-1.5
              pointer-fine:group-hover:border-[var(--sequence-theme)]
            "
          >
            {post.marginalFundingOrg}
          </Type>
        </div>
      )}
    </article>
  );
}
