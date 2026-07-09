"use client";

import type { CommentListItem } from "@/lib/comments/commentLists";
import { useHomePage } from "./HomePageContext";
import ClientPopularCommentsList from "./ClientPopularCommentsList";
import FeaturedPost from "../FeaturedCards/FeaturedPost";
import Type from "../Type";

export default function HomePageFeaturedTab({
  initialPopularComments,
}: Readonly<{
  initialPopularComments: CommentListItem[];
}>) {
  const { currentTab, featuredPosts, curatedPost } = useHomePage();
  if (currentTab !== "featured") {
    return null;
  }

  // On large screens we show 4 fearured posts at the top. On smaller screens,
  // the last two are moved down, underneath popular comments.
  const topPosts = featuredPosts.slice(0, 2);
  const switchingPosts = featuredPosts.slice(2, 4);
  const bottomPosts = featuredPosts.slice(4);

  return (
    <div data-component="HomePageFeaturedTab" className="flex flex-col gap-9 pb-20">
      <Type style="bodyLarge" className="text-gray-600 -mb-3">
        Selected posts to help us answer: How can we do the most good with our
        resources?
      </Type>
      <section className="grid grid-cols-3 gap-1">
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
        <ClientPopularCommentsList initialComments={initialPopularComments} />
      </section>
      <section className="grid grid-cols-3 gap-1">
        {switchingPosts.map((post) => (
          <FeaturedPost key={post._id} post={post} className="xl:hidden" />
        ))}
        {bottomPosts.map((post) => (
          <FeaturedPost key={post._id} post={post} />
        ))}
      </section>
    </div>
  );
}
