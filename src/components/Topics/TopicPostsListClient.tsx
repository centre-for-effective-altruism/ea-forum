"use client";

import type { ReactNode } from "react";
import { useLoadMore } from "@/lib/hooks/useLoadMore";
import { useTracking } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import type { PostListItem } from "@/lib/posts/postLists";
import type { TopicPostsSortedBy } from "@/lib/tags/topicPageParams";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import PostsItem from "../PostsList/PostsItem";
import TextLinkButton from "../TextLinkButton";
import Type from "../Type";

export default function TopicPostsListClient({
  tagId,
  tagName,
  sortedBy,
  initialPosts,
  initialLimit,
  loadMoreLimit,
  bottomRightNode,
}: Readonly<{
  tagId: string;
  tagName: string;
  sortedBy: TopicPostsSortedBy;
  initialPosts: PostListItem[];
  initialLimit: number;
  loadMoreLimit: number;
  bottomRightNode?: ReactNode;
}>) {
  const { captureEvent } = useTracking();
  const { items, loading, limit, canLoadMore, onLoadMore } = useLoadMore({
    initialItems: initialPosts,
    limit: loadMoreLimit,
    fetchMore: async (limit, offset) => {
      captureEvent("topicPostsLoadMore", { tagId, sortedBy, offset });
      const items = await rpc.posts.listForTag({ tagId, sortedBy, limit, offset });
      return { items };
    },
  });
  const showLoadMore = initialPosts.length >= initialLimit && canLoadMore;
  return (
    <section data-component="TopicPostsListClient" className="max-w-full">
      {items.length === 0 ? (
        <Type className="text-gray-600 italic py-2">
          No posts tagged {tagName} yet
        </Type>
      ) : (
        <div className="space-y-0.5">
          {items.map((post) => (
            <PostsItem key={post._id} post={post} />
          ))}
        </div>
      )}
      {loading && <PostsListSkeleton count={limit} className="mt-0.5" />}
      {(showLoadMore || bottomRightNode) && (
        <div className="mt-2 flex justify-between items-center">
          {showLoadMore ? (
            <TextLinkButton
              variant="primary"
              onClick={onLoadMore}
              disabled={loading}
            >
              Load more
            </TextLinkButton>
          ) : (
            <div />
          )}
          {bottomRightNode}
        </div>
      )}
    </section>
  );
}
