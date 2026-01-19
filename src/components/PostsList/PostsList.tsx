"use client";

import { ReactNode, useCallback, useState } from "react";
import type { PostListItem } from "@/lib/posts/postLists";
import type { PostsListView } from "@/lib/posts/postsHelpers";
import { fetchPostsListAction } from "@/lib/posts/postActions";
import { usePostsListView } from "@/lib/hooks/usePostsListView";
import { defaultPostsViewType, PostsListViewType } from "@/lib/posts/postsListView";
import clsx from "clsx";
import PostsListSkeleton from "./PostsListSkeleton";
import PostsItem from "./PostsItem";
import Type from "../Type";

export default function PostsList({
  posts,
  viewType = defaultPostsViewType,
  loadMoreView,
  maxOffset,
  bottomRightNode,
  className,
}: Readonly<{
  posts: PostListItem[];
  /**
   * The view to use for the items - if set to `fromContext` it will use the
   * value from the nearest `PostsListViewProvider` (which default to "list"
   * if there is no provider).
   */
  viewType?: PostsListViewType | "fromContext";
  loadMoreView?: PostsListView;
  maxOffset?: number;
  bottomRightNode?: ReactNode;
  className?: string;
}>) {
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(posts.length);
  const [displayedPosts, setDisplayedPosts] = useState(posts);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const { view } = usePostsListView();
  const actualViewType = viewType === "fromContext" ? view : viewType;

  const onLoadMore = useCallback(async () => {
    if (!loadMoreView || (maxOffset && offset >= maxOffset)) {
      return;
    }

    const offset_ = offset;
    setOffset((offset) => offset + loadMoreView.limit);
    setLoading(true);

    try {
      const results = await fetchPostsListAction({
        ...loadMoreView,
        offset: offset_,
      });
      setDisplayedPosts((posts) => [...posts, ...results]);
      if (results.length < loadMoreView.limit) {
        setCanLoadMore(false);
      }
    } catch (e) {
      console.error("Error fetching posts:", e);
    } finally {
      setLoading(false);
    }
  }, [loadMoreView, offset, maxOffset]);

  return (
    <section className={clsx("max-w-full", className)} data-component="PostsList">
      {displayedPosts.map((post) => (
        <PostsItem key={post._id} post={post} viewType={actualViewType} />
      ))}
      {loadMoreView && (
        <>
          {loading && (
            <PostsListSkeleton
              count={loadMoreView.limit}
              viewType={actualViewType}
            />
          )}
          <div className="mt-2 flex justify-between items-center">
            {canLoadMore ? (
              <Type
                onClick={onLoadMore}
                As="button"
                style="loadMore"
                className="cursor-pointer text-primary hover:opacity-70"
              >
                Load more
              </Type>
            ) : (
              <div />
            )}
            {bottomRightNode}
          </div>
        </>
      )}
    </section>
  );
}
