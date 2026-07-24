"use client";

import { useCallback } from "react";
import type { CommentListItem } from "@/lib/comments/commentLists";
import { CommentsListProvider } from "../Comments/useCommentsList";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useHomePage } from "./HomePageContext";
import { rpc } from "@/lib/rpc";
import range from "lodash/range";
import FeaturedPost from "../FeaturedCards/FeaturedPost";
import CommentsFeed from "../Comments/CommentsFeed";
import TextLinkButton from "../TextLinkButton";
import Type from "../Type";

export default function HomePageFeaturedTab({
  initialPopularComments,
}: Readonly<{
  initialPopularComments: CommentListItem[];
}>) {
  const {
    currentTab,
    featuredPosts,
    loadingFeaturedPosts,
    loadMoreFeaturedPosts,
    curatedPost,
  } = useHomePage();

  const loadMorePopularComments = useCallback(
    async (args: { offset: number; limit: number }) =>
      rpc.comments.listPopular(args),
    [],
  );

  if (currentTab !== "featured") {
    return null;
  }

  // On large screens we show 4 fearured posts at the top. On smaller screens,
  // the last two are moved down, underneath popular comments.
  const topPosts = featuredPosts.slice(0, 2);
  const switchingPosts = featuredPosts.slice(2, 4);
  const bottomPosts = featuredPosts.slice(4, -2);
  const finalPosts = featuredPosts.slice(-2);

  return (
    <AnalyticsContext homePageTab="featured">
      <div
        data-component="HomePageFeaturedTab"
        className="flex flex-col gap-9 pb-20"
      >
        <Type className="text-gray-600 -mt-4 -mb-3">
          Selected posts to help us answer: How can we do the most good with our
          resources?
        </Type>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-1">
          {curatedPost && (
            <FeaturedPost post={curatedPost} large className="xl:row-span-2" />
          )}
          {topPosts.map((post) => (
            <FeaturedPost key={post._id} post={post} />
          ))}
          {switchingPosts.map((post) => (
            <FeaturedPost key={post._id} post={post} className="max-xl:hidden" />
          ))}
        </section>
        <section>
          <Type style="sectionTitleLarge" className="mb-4">
            Popular comments and quick takes
          </Type>
          <CommentsListProvider comments={initialPopularComments} showPostTitle>
            <CommentsFeed
              comments={initialPopularComments}
              loadMore={loadMorePopularComments}
              replaceAllOnLoadMore
              listClassName="grid grid-cols-2 gap-x-1"
            />
          </CommentsListProvider>
        </section>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-1">
          {switchingPosts.map((post) => (
            <FeaturedPost key={post._id} post={post} className="xl:hidden" />
          ))}
          {bottomPosts.map((post) => (
            <FeaturedPost key={post._id} post={post} />
          ))}
          {finalPosts.map((post) => (
            <FeaturedPost key={post._id} post={post} className="max-xl:hidden" />
          ))}
          {loadingFeaturedPosts ? (
            range(3).map((i) => (
              <div
                key={i}
                className="
                  h-full min-h-[300px] bg-surface-floating border-1 border-gray-200
                  rounded p-5 flex flex-col gap-3
                "
              >
                <div className="bg-gray-300 h-[150px] rounded" />
                <div className="grow flex flex-col gap-1">
                  <div className="bg-gray-400 h-[25px] rounded" />
                  <div className="bg-gray-400 h-[25px] rounded" />
                </div>
                <div className="bg-gray-300 h-[20px] rounded" />
              </div>
            ))
          ) : (
            <div className="py-6">
              <TextLinkButton variant="primary" onClick={loadMoreFeaturedPosts}>
                Load more
              </TextLinkButton>
            </div>
          )}
        </section>
      </div>
    </AnalyticsContext>
  );
}
