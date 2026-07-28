import type { Metadata } from "next";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import HomePageColumns from "@/components/HomePage/HomePageColumns";

export const metadata: Metadata = {
  title: "All posts",
  description: "All of the EA Forum's posts, filtered and sorted however you want",
  alternates: {
    canonical: combineUrls(getSiteUrl(), "/all-posts"),
  },
};

export default function AllPostsPage() {
  return <HomePageColumns pageContext="allPostsPage">All posts</HomePageColumns>;
}
