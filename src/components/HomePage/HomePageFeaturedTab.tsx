"use client";

import { useCallback } from "react";
import { CommentsListProvider } from "../Comments/useCommentsList";
import { useHomePageData } from "./HomePageDataContext";
import { filterNonNull } from "@/lib/typeHelpers";
import { rpc } from "@/lib/rpc";
import range from "lodash/range";
import FeaturedPostSkeleton from "../FeaturedCards/FeaturedPostSkeleton";
import HomePageFeaturedTabLayout from "./HomePageFeaturedTabLayout";
import FeaturedPost from "../FeaturedCards/FeaturedPost";
import CommentsFeed from "../Comments/CommentsFeed";
import TextLinkButton from "../TextLinkButton";

export default function HomePageFeaturedTab() {
  const {
    featuredPosts,
    loadingFeaturedPosts,
    loadMoreFeaturedPosts,
    curatedPost,
    initialPopularCommentsAndQuickTakes,
  } = useHomePageData();

  const loadMorePopularComments = useCallback(
    async (args: { offset: number; limit: number }) =>
      rpc.comments.listPopular(args),
    [],
  );

  const postNodes = filterNonNull([
    curatedPost ? (
      <FeaturedPost post={curatedPost} large className="h-full" />
    ) : null,
    ...featuredPosts.map((post) => (
      <FeaturedPost key={post._id} post={post} className="h-full" />
    )),
  ]);

  return (
    <HomePageFeaturedTabLayout
      posts={postNodes}
      loadMorePosts={
        loadingFeaturedPosts ? (
          range(3).map((i) => <FeaturedPostSkeleton key={i} />)
        ) : (
          <div className="py-6">
            <TextLinkButton variant="primary" onClick={loadMoreFeaturedPosts}>
              Load more
            </TextLinkButton>
          </div>
        )
      }
      commentsSection={
        <CommentsListProvider
          comments={initialPopularCommentsAndQuickTakes}
          showPostTitle
        >
          <CommentsFeed
            comments={initialPopularCommentsAndQuickTakes}
            loadMore={loadMorePopularComments}
            replaceAllOnLoadMore
            listClassName="grid grid-cols-2 gap-x-1"
          />
        </CommentsListProvider>
      }
    />
  );
}
