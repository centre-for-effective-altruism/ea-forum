"use client";

import Image from "next/image";
import type { SequenceEventPost } from "@/lib/sequences/sequenceEventQueries";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import { usePostIsRead } from "@/lib/hooks/useItemsRead";
import {
  getPostPlaintextDescription,
  getPostSocialImageUrl,
  postGetPageUrl,
} from "@/lib/posts/postsHelpers";
import clsx from "clsx";
import SequenceEventPostAuthors from "./SequenceEventPostAuthors";
import Type from "../Type";
import Link from "../Link";

const placeholderImageUrl =
  "https://res.cloudinary.com/cea/image/upload/v1761927213/ForumImagePlaceholder.jpg";

export default function SequenceEventCard({
  post,
}: Readonly<{
  post: SequenceEventPost;
}>) {
  const href = postGetPageUrl({ post });
  const { onClick } = useClickableCell({ href });
  const isRead = usePostIsRead(post);
  const imageUrl =
    getPostSocialImageUrl(post, { width: 500, dpr: 2 }) ?? placeholderImageUrl;
  const description = getPostPlaintextDescription(post);
  return (
    <article
      data-component="SequenceEventCard"
      onClick={onClick}
      className={clsx(
        "group flex gap-8 p-10 max-[600px]:p-5 cursor-pointer",
        "hover:bg-(--sequence-hover)! hover:text-(--sequence-theme)",
        isRead ? "bg-(--sequence-theme)" : "bg-always-white",
      )}
    >
      <div className="flex flex-col gap-4 min-w-0">
        <Image
          src={imageUrl}
          alt={post.title}
          width={500}
          height={216}
          className="
            w-full h-[216px] max-[700px]:h-auto object-cover
            transition-transform duration-200 group-hover:scale-[1.02]
          "
        />
        <InteractionWrapper>
          <Link href={href}>
            <Type
              As="span"
              style="postTitle"
              className="text-[28px]! tracking-[-0.02em]"
            >
              {post.title}
            </Type>
          </Link>
        </InteractionWrapper>
        {description && (
          <Type
            style="bodyLarge"
            className="leading-[140%] tracking-[-0.01em] line-clamp-3"
          >
            {description}
          </Type>
        )}
        <SequenceEventPostAuthors post={post} />
      </div>
      {post.marginalFundingOrg && (
        <div>
          <Type
            style="bodySmallMedium"
            className="
              whitespace-nowrap [writing-mode:vertical-rl] uppercase
              border border-always-black group-hover:border-(--sequence-theme)
              rounded-[26px] leading-[140%] tracking-[-0.01em] px-0.5 py-1.5
            "
          >
            {post.marginalFundingOrg}
          </Type>
        </div>
      )}
    </article>
  );
}
