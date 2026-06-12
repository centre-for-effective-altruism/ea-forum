"use client";

import { useCallback, useState } from "react";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import type { PostListItem } from "@/lib/posts/postLists";
import PostsTooltip from "../PostsTooltip";
import Score from "../Score";
import Type from "../Type";
import Link from "../Link";

const COLLAPSED_COUNT = 5;

export default function PostPingbacksList({
  pingbacks,
}: Readonly<{
  pingbacks: PostListItem[];
}>) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const onReveal = useCallback(() => setIsCollapsed(false), []);
  const pingbacksToDisplay = isCollapsed
    ? pingbacks.slice(0, COLLAPSED_COUNT)
    : pingbacks;
  return (
    <div data-component="PostPingbacksList">
      {pingbacksToDisplay.map((post) => (
        <PostsTooltip key={post._id} post={post}>
          <Link
            href={postGetPageUrl({ post })}
            className="flex items-center gap-2 hover:bg-gray-100/70 rounded py-1"
          >
            <Score
              baseScore={post.baseScore}
              voteCount={post.voteCount}
              orientation="horizontal"
              className="w-[50px] min-w-[50px]"
            />
            <Type style="bodyHeavy" className="truncate">
              {post.title}
            </Type>
          </Link>
        </PostsTooltip>
      ))}
      {pingbacks.length > COLLAPSED_COUNT && isCollapsed && (
        <Type
          onClick={onReveal}
          style="bodyHeavy"
          As="button"
          className="cursor-pointer text-primary hover:text-primary-dark mt-2"
        >
          Show all ({COLLAPSED_COUNT}/{pingbacks.length})
        </Type>
      )}
    </div>
  );
}
