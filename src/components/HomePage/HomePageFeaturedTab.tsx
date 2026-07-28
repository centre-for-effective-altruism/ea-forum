"use client";

import { useCallback, useState } from "react";
import { CommentsListProvider } from "../Comments/useCommentsList";
import { captureException } from "@sentry/nextjs";
import { useTracking } from "@/lib/analyticsEvents";
import { usePostsListView } from "@/lib/hooks/usePostsListView";
import { HideRepeatedPostsProvider } from "@/lib/hooks/useHideRepeatedPosts";
import { filterNonNull } from "@/lib/typeHelpers";
import { rpc } from "@/lib/rpc";
import type { PostListItem } from "@/lib/posts/postLists";
import type { CommentListItem } from "@/lib/comments/commentLists";
import range from "lodash/range";
import FeaturedPostSkeleton from "../FeaturedCards/FeaturedPostSkeleton";
import HomePageFeaturedTabLayout from "./HomePageFeaturedTabLayout";
import FeaturedPost from "../FeaturedCards/FeaturedPost";
import PostsListViewPicker from "../PostsList/PostsListViewPicker";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import PostsItem from "../PostsList/PostsItem";
import CommentsFeed from "../Comments/CommentsFeed";
import TextLinkButton from "../TextLinkButton";

export default function HomePageFeaturedTab({
  curatedPost,
  initialFeaturedPosts,
  initialPopularCommentsAndQuickTakes,
}: Readonly<{
  curatedPost: PostListItem | null;
  initialFeaturedPosts: PostListItem[];
  initialPopularCommentsAndQuickTakes: CommentListItem[];
}>) {
  const { captureEvent } = useTracking();
  const { view } = usePostsListView();
  const [featuredPosts, setFeaturedPosts] =
    useState<PostListItem[]>(initialFeaturedPosts);
  const [loadingFeaturedPosts, setLoadingFeaturedPosts] = useState(false);

  const loadMoreFeaturedPosts = useCallback(async () => {
    setLoadingFeaturedPosts(true);
    try {
      const limit = 3;
      const posts = await rpc.posts.listFeatured({
        offset: featuredPosts.length,
        limit,
      });
      setFeaturedPosts((featuredPosts) => [...featuredPosts, ...posts]);
      captureEvent("loadMoreFeaturedPosts", { total: featuredPosts.length + limit });
    } catch (e) {
      console.error("Error loading featured posts:", e);
      captureException(e);
    }
    setLoadingFeaturedPosts(false);
  }, [featuredPosts.length, captureEvent]);

  const loadMorePopularComments = useCallback(
    async (args: { limit: number }) => rpc.comments.listPopularAndQuickTakes(args),
    [],
  );

  // The curated post is shown separately (large) at the front of the list.
  const listPosts = filterNonNull([curatedPost, ...featuredPosts]);

  const postNodes = filterNonNull([
    curatedPost ? (
      <FeaturedPost post={curatedPost} large className="h-full" />
    ) : null,
    ...featuredPosts.map((post) => (
      <FeaturedPost key={post._id} post={post} className="h-full" />
    )),
  ]);

  const loadMoreLink = (
    <TextLinkButton variant="primary" onClick={loadMoreFeaturedPosts}>
      Load more
    </TextLinkButton>
  );

  const listSection = (
    <HideRepeatedPostsProvider>
      <section className="max-w-full space-y-0.5" data-component="FeaturedPostsList">
        {listPosts.map((post) => (
          <PostsItem key={post._id} post={post} viewType="list" />
        ))}
        {loadingFeaturedPosts ? (
          <PostsListSkeleton count={3} viewType="list" />
        ) : (
          <div className="mt-2">{loadMoreLink}</div>
        )}
      </section>
    </HideRepeatedPostsProvider>
  );

  return (
    <HomePageFeaturedTabLayout
      view={view}
      viewPicker={<PostsListViewPicker />}
      posts={postNodes}
      loadMorePosts={
        loadingFeaturedPosts ? (
          range(3).map((i) => <FeaturedPostSkeleton key={i} />)
        ) : (
          <div className="py-6">{loadMoreLink}</div>
        )
      }
      listSection={listSection}
      commentsSection={
        <CommentsListProvider
          comments={initialPopularCommentsAndQuickTakes}
          showPostTitle
        >
          <CommentsFeed
            comments={initialPopularCommentsAndQuickTakes}
            loadMore={loadMorePopularComments}
            replaceAllOnLoadMore
            listClassName="grid grid-cols-1 mobile-nav:grid-cols-2 gap-x-1"
          />
        </CommentsListProvider>
      }
    />
  );
}
