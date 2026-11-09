"use client";

import { useLoadMore } from "@/lib/hooks/useLoadMore";
import { useTracking } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import type { PostListItem } from "@/lib/posts/postLists";
import HomePageMarginalFundingTabLayout from "./HomePageMarginalFundingTabLayout";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import FeaturedPost from "../FeaturedCards/FeaturedPost";
import TextLinkButton from "../TextLinkButton";
import PostsItem from "../PostsList/PostsItem";

export default function HomePageMarginalFundingTab({
  explainerPost,
  tagId,
  cardPosts,
  initialListPosts,
  initialListLimit,
  loadMoreLimit,
}: Readonly<{
  explainerPost: PostListItem | null;
  tagId: string | null;
  cardPosts: PostListItem[];
  initialListPosts: PostListItem[];
  initialListLimit: number;
  loadMoreLimit: number;
}>) {
  const { captureEvent } = useTracking();
  const { items, loading, limit, canLoadMore, onLoadMore } = useLoadMore({
    initialItems: initialListPosts,
    limit: loadMoreLimit,
    fetchMore: async (limit, offset) => {
      if (!tagId) {
        return { items: [] };
      }
      const listOffset = cardPosts.length + offset;
      captureEvent("marginalFundingPostsLoadMore", { offset: listOffset });
      const items = await rpc.posts.listForTag({
        tagId,
        sortedBy: "top",
        excludePostId: explainerPost?._id,
        offset: listOffset,
        limit,
      });
      return { items };
    },
  });
  const showLoadMore = initialListPosts.length >= initialListLimit && canLoadMore;

  return (
    <HomePageMarginalFundingTabLayout
      explainerPost={
        explainerPost && <FeaturedPost post={explainerPost} className="h-full" />
      }
      posts={cardPosts.map((post) => (
        <FeaturedPost key={post._id} post={post} className="h-full" />
      ))}
      listSection={
        items.length > 0 && (
          <section className="max-w-full">
            <div className="space-y-0.5">
              {items.map((post) => (
                <PostsItem key={post._id} post={post} />
              ))}
            </div>
            {loading && <PostsListSkeleton count={limit} className="mt-0.5" />}
            {showLoadMore && (
              <TextLinkButton
                variant="primary"
                onClick={onLoadMore}
                disabled={loading}
                className="mt-2"
              >
                Load more
              </TextLinkButton>
            )}
          </section>
        )
      }
    />
  );
}
