"use client";

import type { PostListItem } from "@/lib/posts/postLists";
import {
  usePostsListView,
  PostsListViewType,
  defaultPostsViewType,
} from "@/lib/hooks/usePostsListView";
import PostsItem from "./PostsItem";
import clsx from "clsx";

export default function PostsList({
  posts,
  viewType = defaultPostsViewType,
  className,
}: Readonly<{
  posts: PostListItem[];
  /**
   * The view to use for the items - if set to `fromContext` it will use the
   * value from the nearest `PostsListViewProvider` (which default to "list"
   * if there is no provider).
   */
  viewType?: PostsListViewType | "fromContext";
  className?: string;
}>) {
  const { view } = usePostsListView();
  const actualViewType = viewType === "fromContext" ? view : viewType;
  return (
    <section className={clsx("max-w-full", className)} data-component="PostsList">
      {posts.map((post) => (
        <PostsItem key={post._id} post={post} viewType={actualViewType} />
      ))}
    </section>
  );
}
