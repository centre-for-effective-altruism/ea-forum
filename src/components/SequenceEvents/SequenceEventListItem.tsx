"use client";

import type { SequenceEventPost } from "@/lib/sequences/sequenceEventQueries";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import { usePostIsRead } from "@/lib/hooks/useItemsRead";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import clsx from "clsx";
import SequenceEventPostAuthors from "./SequenceEventPostAuthors";
import Type from "../Type";
import Link from "../Link";

export default function SequenceEventListItem({
  post,
}: Readonly<{
  post: SequenceEventPost;
}>) {
  const href = postGetPageUrl({ post });
  const { onClick } = useClickableCell({ href });
  const isRead = usePostIsRead(post);
  const cellClassName = clsx(
    "flex flex-col justify-center gap-1 px-15 py-10",
    "max-[960px]:block max-[960px]:first:pb-0 max-[960px]:not-first:pt-4",
    "max-[600px]:p-5 group-hover:bg-(--sequence-hover)",
    isRead ? "bg-(--sequence-theme)" : "bg-always-white",
  );
  return (
    <article
      data-component="SequenceEventListItem"
      onClick={onClick}
      className="
        group contents max-[960px]:flex max-[960px]:flex-col
        cursor-pointer hover:text-(--sequence-theme)
      "
    >
      <div className={cellClassName}>
        {post.marginalFundingOrg && (
          <div>
            <Type
              As="span"
              style="bodySmallMedium"
              className="
                inline-block whitespace-nowrap uppercase
                border border-always-black group-hover:border-(--sequence-theme)
                rounded-[26px] leading-[140%] tracking-[-0.01em] px-1.5 py-0.5
              "
            >
              {post.marginalFundingOrg}
            </Type>
          </div>
        )}
      </div>
      <div className={cellClassName}>
        <InteractionWrapper>
          <Link href={href}>
            <Type
              As="span"
              style="postTitle"
              className="text-[30px]! tracking-[-0.02em]"
            >
              {post.title}
            </Type>
          </Link>
        </InteractionWrapper>
        <SequenceEventPostAuthors post={post} />
      </div>
    </article>
  );
}
