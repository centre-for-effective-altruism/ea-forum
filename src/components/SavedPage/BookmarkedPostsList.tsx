"use client";

import type { PostListItem } from "@/lib/posts/postLists";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import { useSavedPageList } from "./useSavedPageList";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import PostsItem from "../PostsList/PostsItem";
import LoadMoreButton from "./LoadMoreButton";
import Type from "../Type";

export default function BookmarkedPostsList({
  initialPosts,
}: Readonly<{
  initialPosts: PostListItem[];
}>) {
  const { items, loading, canLoadMore, onLoadMore } = useSavedPageList(
    initialPosts,
    (limit, offset) => rpc.bookmarks.listPosts({ limit, offset }),
  );
  return (
    <AnalyticsContext pageSubSectionContext="bookmarksList">
      <div data-component="BookmarkedPostsList" className="flex flex-col gap-0.5">
        {items.length === 0 && (
          <Type className="text-gray-600">
            You haven&apos;t saved any posts yet.
          </Type>
        )}
        {items.map((post) => (
          <PostsItem key={post._id} post={post} />
        ))}
        {loading && <PostsListSkeleton count={5} />}
        <LoadMoreButton
          canLoadMore={canLoadMore}
          loading={loading}
          onLoadMore={onLoadMore}
        />
      </div>
    </AnalyticsContext>
  );
}
