"use client";

import type { EditorialPagePost } from "@/lib/sequences/editorialPageContentQueries";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import { usePostIsRead } from "@/lib/hooks/useItemsRead";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import clsx from "clsx";
import { editorialPageItemClasses } from "./editorialPageItemStyles";
import EditorialPageAuthors from "./EditorialPageAuthors";
import Link from "../Link";
import Type from "../Type";

export default function EditorialPageListItem({
  post,
}: Readonly<{
  post: EditorialPagePost;
}>) {
  const href = postGetPageUrl({ post });
  const { onClick } = useClickableCell({ href });
  const isRead = usePostIsRead(post);
  return (
    <article
      data-component="EditorialPageListItem"
      onClick={onClick}
      className={clsx(
        editorialPageItemClasses(isRead),
        "justify-center gap-1 px-15 py-10 max-[600px]:p-5",
      )}
    >
      <InteractionWrapper>
        <Type As="h2" style="editorialPageListTitle">
          <Link href={href} className="hover:opacity-100">
            {post.title}
          </Link>
        </Type>
      </InteractionWrapper>
      <EditorialPageAuthors post={post} byClassName="font-[500]" />
    </article>
  );
}
