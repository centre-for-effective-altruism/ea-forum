"use client";

import { usePostsListView } from "@/lib/hooks/usePostsListView";
import { filterNonNull } from "@/lib/typeHelpers";
import clsx from "clsx";
import type { PostListItem } from "@/lib/posts/postLists";
import HomePageMarginalFundingTabLayout from "./HomePageMarginalFundingTabLayout";
import FeaturedPost from "../FeaturedCards/FeaturedPost";
import PostsItem from "../PostsList/PostsItem";

// Read posts keep dark text on the orange background in both light and dark mode
const readTextClassName = clsx(
  "[--color-gray-500:rgba(0,0,0,0.6)] [--color-gray-600:rgba(0,0,0,0.7)]",
  "[--color-gray-700:rgba(0,0,0,0.8)] [--color-gray-900:#000] [--color-gray-1000:#000]",
);

const readCardClassName = clsx(
  "bg-(--marginal-funding-theme)! border-(--marginal-funding-border)!",
  "hover:brightness-105",
  readTextClassName,
);

const readListItemClassName = clsx(
  "bg-(--marginal-funding-theme)! ring-1 ring-inset ring-(--marginal-funding-border)",
  "hover:brightness-105",
  readTextClassName,
);

export default function HomePageMarginalFundingTab({
  explainerPost,
  cardPosts,
  listPosts,
}: Readonly<{
  explainerPost: PostListItem | null;
  cardPosts: PostListItem[];
  listPosts: PostListItem[];
}>) {
  const { view } = usePostsListView();
  const visibleListPosts =
    view === "list"
      ? filterNonNull([explainerPost, ...cardPosts, ...listPosts])
      : listPosts;

  return (
    <HomePageMarginalFundingTabLayout
      view={view}
      explainerPost={
        explainerPost && (
          <FeaturedPost
            post={explainerPost}
            readClassName={readCardClassName}
            className="h-full"
          />
        )
      }
      posts={cardPosts.map((post) => (
        <FeaturedPost
          key={post._id}
          post={post}
          readClassName={readCardClassName}
          className="h-full"
        />
      ))}
      listSection={
        visibleListPosts.length > 0 && (
          <section className="max-w-full space-y-0.5">
            {visibleListPosts.map((post) => (
              <PostsItem
                key={post._id}
                post={post}
                viewType="list"
                readClassName={readListItemClassName}
              />
            ))}
          </section>
        )
      }
    />
  );
}
