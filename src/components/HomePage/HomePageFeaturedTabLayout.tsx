"use client";

import type { ReactNode } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import {
  defaultFeaturedViewType,
  PostsListViewType,
} from "@/lib/posts/postsListView";
import clsx from "clsx";

export default function HomePageFeaturedTabLayout({
  posts,
  loadMorePosts,
  listSection,
  commentsSection,
  view = defaultFeaturedViewType,
}: Readonly<{
  posts: ReactNode[];
  loadMorePosts?: ReactNode;
  listSection?: ReactNode;
  commentsSection: ReactNode;
  view?: PostsListViewType;
}>) {
  // The main post only spans two rows on large screens, so on smaller screens
  // we hide the last two posts to keep the grid rows full.
  const [mainPost, ...featuredPosts] = posts;

  return (
    <AnalyticsContext homePageTab="featured">
      <div
        data-component="HomePageFeaturedTabLayout"
        className={clsx(
          "flex flex-col gap-9 pb-20",
          // In list view, match the New & upvoted tab's narrower width. Card
          // view keeps the full width so the card grid can breathe.
          view === "list" && "max-w-[1000px]",
        )}
      >
        {view === "list" ? (
          listSection
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-1">
            {mainPost && <div className="xl:row-span-2 h-full">{mainPost}</div>}
            {featuredPosts.map((post, i) => (
              <div
                key={i}
                className={clsx(
                  "h-full",
                  i >= featuredPosts.length - 2 && "max-xl:hidden",
                )}
              >
                {post}
              </div>
            ))}
            {loadMorePosts}
          </section>
        )}
        <div className="w-full max-w-[768px] mx-auto">{commentsSection}</div>
      </div>
    </AnalyticsContext>
  );
}
