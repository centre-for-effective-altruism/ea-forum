"use client";

import { Fragment } from "react";
import type { PostListItem } from "@/lib/posts/postLists";
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
  post: PostListItem;
}>) {
  const { postsRead } = useItemsRead();
  const href = postGetPageUrl({ post });
  const { onClick } = useClickableCell({ href });

  const isRead = !!(post._id in postsRead
    ? postsRead[post._id]
    : post.readStatus?.[0]?.isRead);

  return (
    <article
      data-component="SequenceEventListItem"
      onClick={onClick}
      className={clsx(
        `
          flex flex-col justify-center gap-1 cursor-pointer
          px-15 py-10 max-[600px]:p-5
          pointer-fine:hover:bg-[var(--sequence-hover)]!
          pointer-fine:hover:text-[var(--sequence-theme)]
        `,
        isRead ? "bg-[var(--sequence-theme)]" : "bg-always-white",
      )}
    >
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
    </article>
  );
}
