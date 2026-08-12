"use client";

import { Fragment } from "react";
import type { SequenceEventPost } from "@/lib/posts/postLists";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import { useItemsRead } from "@/lib/hooks/useItemsRead";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import clsx from "clsx";
import UsersName from "../UsersName";
import Link from "../Link";
import Type from "../Type";

export default function SequenceEventListItem({
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

  // The item's two cells are placed directly into the page's grid, so that the
  // org column lines up across every row
  const cellClasses = clsx(
    `
      flex flex-col justify-center gap-1 px-15 py-10
      max-[960px]:block max-[960px]:first:pb-0 max-[960px]:not-first:pt-4
      max-[600px]:p-5
      pointer-fine:group-hover:bg-[var(--sequence-hover)]!
    `,
    isRead ? "bg-[var(--sequence-theme)]" : "bg-always-white",
  );

  return (
    <article
      data-component="SequenceEventListItem"
      onClick={onClick}
      className="
        group contents cursor-pointer
        max-[960px]:flex max-[960px]:flex-col
        pointer-fine:hover:text-[var(--sequence-theme)]
      "
    >
      <div className={cellClasses}>
        {post.marginalFundingOrg && (
          <div>
            <Type
              style="sequenceEventOrg"
              className="
                inline-block whitespace-nowrap border border-[var(--sequence-text)]
                rounded-[26px] px-1.5 py-0.5
                pointer-fine:group-hover:border-[var(--sequence-theme)]
              "
            >
              {post.marginalFundingOrg}
            </Type>
          </div>
        )}
      </div>
      <div className={cellClasses}>
        <InteractionWrapper>
          <Type As="h2" style="sequenceEventListTitle">
            <Link href={href} className="hover:opacity-100">
              {post.title}
            </Link>
          </Type>
        </InteractionWrapper>
        <Type style="sequenceEventAuthors">
          <span className="font-[500]">by</span>{" "}
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
    </article>
  );
}
