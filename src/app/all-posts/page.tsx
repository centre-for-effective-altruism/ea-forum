import { Suspense } from "react";
import type { Metadata } from "next";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import DynamicAllPostsList from "@/components/AllPosts/DynamicAllPostsList";
import PostsListSkeleton from "@/components/PostsList/PostsListSkeleton";
import AllPostsSettings from "@/components/AllPosts/AllPostsSettings";
import HomePageColumns from "@/components/HomePage/HomePageColumns";
import Type from "@/components/Type";

export const metadata: Metadata = {
  title: "All posts",
  description: "All of the EA Forum's posts, filtered and sorted however you want",
  alternates: {
    canonical: combineUrls(getSiteUrl(), "/all-posts"),
  },
};

export default function AllPostsPage() {
  return (
    <HomePageColumns pageContext="allPostsPage">
      <div className="max-w-[1000px] mx-auto flex flex-col gap-5 pb-20">
        <Type style="postsPageTitle">All posts</Type>
        <Suspense fallback={<div className="bg-gray-200 rounded h-42" />}>
          <AllPostsSettings />
        </Suspense>
        <Suspense fallback={<PostsListSkeleton count={10} />}>
          <DynamicAllPostsList />
        </Suspense>
      </div>
    </HomePageColumns>
  );
}
