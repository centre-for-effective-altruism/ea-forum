import type { Metadata } from "next";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import HomePageColumns from "@/components/HomePage/HomePageColumns";
import AllPostsSettings from "@/components/AllPostsSettings";
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
      <div className="max-w-[1000px] mx-auto">
        <Type style="sectionTitleLarge" className="mb-5">
          All posts
        </Type>
        <AllPostsSettings />
      </div>
    </HomePageColumns>
  );
}
