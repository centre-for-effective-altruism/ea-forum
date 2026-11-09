"use client";

import type { PostListItem } from "@/lib/posts/postLists";
import HomePageMarginalFundingTabLayout from "./HomePageMarginalFundingTabLayout";
import FeaturedPost from "../FeaturedCards/FeaturedPost";

export default function HomePageMarginalFundingTab({
  explainerPost,
}: Readonly<{
  explainerPost: PostListItem | null;
}>) {
  return (
    <HomePageMarginalFundingTabLayout
      explainerPost={
        explainerPost && <FeaturedPost post={explainerPost} className="h-full" />
      }
    />
  );
}
