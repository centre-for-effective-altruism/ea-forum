"use client";

import type { PostsListViewType } from "@/lib/posts/postsListView";
import { usePostsListView } from "@/lib/hooks/usePostsListView";
import PostsItemSkeleton from "./PostsItemSkeleton";
import clsx from "clsx";

export default function PostsListSkeleton({
  count,
  viewType,
  className,
}: Readonly<{
  count: number;
  viewType?: PostsListViewType | "fromContext";
  className?: string;
}>) {
  const { view } = usePostsListView();
  const actualViewType = viewType === "fromContext" ? view : viewType;
  return (
    <section
      data-component="PostsListSkeleton"
      className={clsx("max-w-full flex flex-col gap-[2px]", className)}
    >
      {new Array(count).fill(null).map((_, i) => (
        <PostsItemSkeleton key={i} viewType={actualViewType} />
      ))}
    </section>
  );
}
