"use client";

import Image from "next/image";
import type { EditorialPagePost } from "@/lib/sequences/editorialPageContentQueries";
import { InteractionWrapper, useClickableCell } from "@/lib/hooks/useClickableCell";
import { usePostIsRead } from "@/lib/hooks/useItemsRead";
import { hideBrokenImage } from "@/lib/utils/domHelpers";
import {
  getPostPlaintextDescription,
  getPostSocialImageUrlWithDefaultBackup,
  postGetPageUrl,
} from "@/lib/posts/postsHelpers";
import clsx from "clsx";
import { editorialPageItemClasses } from "./editorialPageItemStyles";
import EditorialPageAuthors from "./EditorialPageAuthors";
import Link from "../Link";
import Type from "../Type";

export default function EditorialPageCard({
  post,
}: Readonly<{
  post: EditorialPagePost;
}>) {
  const href = postGetPageUrl({ post });
  const { onClick } = useClickableCell({ href });
  const isRead = usePostIsRead(post);
  const imageUrl = getPostSocialImageUrlWithDefaultBackup(post, {
    width: 500,
    dpr: 2,
  });
  return (
    <article
      data-component="EditorialPageCard"
      onClick={onClick}
      className={clsx(
        editorialPageItemClasses(isRead),
        "group gap-4 p-10 max-[600px]:p-5",
      )}
    >
      <Image
        src={imageUrl}
        onError={hideBrokenImage}
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
        <Type As="h2" style="editorialPageCardTitle">
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
      <EditorialPageAuthors post={post} />
    </article>
  );
}
