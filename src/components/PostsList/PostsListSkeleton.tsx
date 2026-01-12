"use client";

import type { PostsListViewType } from "@/lib/posts/postsListView";
import { usePostsListView } from "@/lib/hooks/usePostsListView";
import PostsItemSkeleton from "./PostsItemSkeleton";

export default function PostsListSkeleton({
  count,
  viewType,
}: Readonly<{
  count: number;
  viewType?: PostsListViewType | "fromContext";
}>) {
  const { view } = usePostsListView();
  const actualViewType = viewType === "fromContext" ? view : viewType;
  return (
    <section className="max-w-full" data-component="PostsListSkeleton">
      {new Array(count).fill(null).map((_, i) => (
        <PostsItemSkeleton key={i} viewType={actualViewType} />
      ))}
    </section>
  );
}
