import { Suspense } from "react";
import type { Metadata } from "next";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import { AllPostsProvider } from "@/components/AllPosts/AllPostsContext";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import AllPostsOptionsToggle from "@/components/AllPosts/AllPostsOptionsToggle";
import DynamicAllPostsList from "@/components/AllPosts/DynamicAllPostsList";
import PostsListSkeleton from "@/components/PostsList/PostsListSkeleton";
import AllPostsSettings from "@/components/AllPosts/AllPostsSettings";
import HomePageColumns from "@/components/HomePage/HomePageColumns";
import Type from "@/components/Type";
import Link from "@/components/Link";

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
      <div className="max-w-[1000px] mx-auto flex flex-col gap-6 pb-20">
        <AnalyticsContext listContext="allPostsPage">
          <AllPostsProvider>
            <div className="flex items-center justify-between gap-4">
              <Type style="postsPageTitle">
                <Link href="/all-posts">All posts</Link>
              </Type>
              <AllPostsOptionsToggle />
            </div>
            <Suspense fallback={<div className="bg-gray-200 rounded h-42" />}>
              <AllPostsSettings />
            </Suspense>
            <Suspense fallback={<PostsListSkeleton count={10} />}>
              <DynamicAllPostsList />
            </Suspense>
          </AllPostsProvider>
        </AnalyticsContext>
      </div>
    </HomePageColumns>
  );
}
