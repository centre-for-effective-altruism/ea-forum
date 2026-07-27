"use client";

import type { ReactNode } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import Type from "../Type";

export default function HomePageFeaturedTabLayout({
  posts,
  loadMorePosts,
  commentsSection,
}: Readonly<{
  posts: ReactNode[];
  loadMorePosts?: ReactNode;
  commentsSection: ReactNode;
}>) {
  // On large screens we show 4 fearured posts at the top. On smaller screens,
  // the last two are moved down, underneath popular comments.
  const [mainPost, ...featuredPosts] = posts;
  const topPosts = featuredPosts.slice(0, 2);
  const switchingPosts = featuredPosts.slice(2, 4);
  const bottomPosts = featuredPosts.slice(4, -2);
  const finalPosts = featuredPosts.slice(-2);

  return (
    <AnalyticsContext homePageTab="featured">
      <div
        data-component="HomePageFeaturedTabLayout"
        className="flex flex-col gap-9 pb-20"
      >
        <Type className="text-gray-600 -mt-4 -mb-3">
          Selected posts to help us answer: How can we do the most good with our
          resources?
        </Type>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-1">
          {mainPost && <div className="xl:row-span-2 h-full">{mainPost}</div>}
          {topPosts.map((post, i) => (
            <div key={i} className="h-full">
              {post}
            </div>
          ))}
          {switchingPosts.map((post, i) => (
            <div key={i} className="max-xl:hidden h-full">
              {post}
            </div>
          ))}
        </section>
        <section>
          <Type style="sectionTitleLarge" className="mb-4">
            Popular comments and quick takes
          </Type>
          {commentsSection}
        </section>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-1">
          {switchingPosts.map((post, i) => (
            <div key={i} className="xl:hidden h-full">
              {post}
            </div>
          ))}
          {bottomPosts.map((post, i) => (
            <div key={i} className="h-full">
              {post}
            </div>
          ))}
          {finalPosts.map((post, i) => (
            <div key={i} className="max-xl:hidden h-full">
              {post}
            </div>
          ))}
          {loadMorePosts}
        </section>
      </div>
    </AnalyticsContext>
  );
}
