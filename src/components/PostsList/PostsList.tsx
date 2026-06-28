"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import type { PostListItem } from "@/lib/posts/postLists";
import type { PostsListView } from "@/lib/posts/postsHelpers";
import { rpc } from "@/lib/rpc";
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
  postItemClassName,
  curatedIconLeft,
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
  postItemClassName?: string;
  curatedIconLeft?: boolean;
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
      const data = await rpc.posts.list({
        ...loadMoreView,
        offset: offset_,
      });
      setDisplayedPosts((posts) => [...posts, ...data]);
      if (data.length < loadMoreView.limit) {
        setCanLoadMore(false);
      }
    } catch (e) {
      console.error("Error loading posts:", e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      captureException(e);
    } finally {
      setLoading(false);
    }
  }, [loadMoreView, offset, maxOffset]);

  useEffect(() => {
    if (displayedPosts.length === 0 && !loading && canLoadMore) {
      void onLoadMore();
    }
  }, [displayedPosts, loading, canLoadMore, onLoadMore]);

  return (
    <section
      className={clsx("max-w-full space-y-0.5", className)}
      data-component="PostsList"
    >
      {displayedPosts.map((post) => (
        <PostsItem
          key={post._id}
          post={post}
          viewType={actualViewType}
          curatedIconLeft={curatedIconLeft}
          className={postItemClassName}
        />
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
                className="inline-block cursor-pointer text-primary hover:bg-primary/10 rounded px-2 py-1 -mx-2 -my-1"
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
