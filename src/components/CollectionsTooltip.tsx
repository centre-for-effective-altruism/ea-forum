"use client";

import { ElementType, ReactNode } from "react";
import type { Placement } from "@floating-ui/react";
import type { SequencePost } from "@/lib/sequences/sequenceQueries";
import type { CollectionBase } from "@/lib/collections/collectionQueries";
import { collectionReadPostCount } from "@/lib/collections/collectionHelpers";
import { useCollectionPosts } from "@/lib/hooks/useCollectionPosts";
import PostBody from "./ContentStyles/PostBody";
import UsersName from "./UsersName";
import Tooltip from "./Tooltip";
import Type from "./Type";

export default function CollectionsTooltip({
  collection,
  collectionPosts,
  placement,
  As,
  className,
  children,
}: Readonly<{
  collection: CollectionBase;
  collectionPosts?: { posts: SequencePost[]; loading: boolean };
  placement?: Placement;
  As?: ElementType;
  className?: string;
  children: ReactNode;
}>) {
  const fetchedPosts = useCollectionPosts(collection?._id, !!collectionPosts);
  const { posts, loading } = collectionPosts ?? fetchedPosts;

  if (!collection) {
    return <>{children}</>;
  }

  const { title, user, html } = collection;
  const postCount = posts.length;
  const readPosts = collectionReadPostCount(posts);
  return (
    <Tooltip
      placement={placement}
      As={As}
      className={className}
      popover
      tooltipClassName="p-0! w-[360px]"
      title={
        <div data-component="CollectionsTooltip" className="px-4 py-3">
          <Type style="postTitle" className="font-[700] mb-1">
            {title}
          </Type>
          <Type style="bodySmall" className="mb-2">
            <UsersName user={user} />
            {!loading && (
              <>
                {" · "}
                <span>
                  {readPosts}/{postCount} post{postCount === 1 ? "" : "s"} read
                </span>
              </>
            )}
          </Type>
          <PostBody html={html} smallText />
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
