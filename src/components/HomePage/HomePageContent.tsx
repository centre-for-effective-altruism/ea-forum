import type { NextSearchParams } from "@/lib/typeHelpers";
import {
  fetchFeaturedFrontpagePosts,
  fetchMostRecentlyCuratedPost,
} from "@/lib/posts/postLists";
import { fetchPopularComments } from "@/lib/comments/commentLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import { HomePageProvider } from "./HomePageContext";
import HomePageFeaturedTab from "./HomePageFeaturedTab";
import HomePageTabs from "./HomePageTabs";

export default async function HomePageContent({
  search,
}: Readonly<{
  search: NextSearchParams;
}>) {
  const currentUser = await getCurrentUser();
  const [featuredPosts, curatedPost, popularComments] = await Promise.all([
    fetchFeaturedFrontpagePosts({ currentUser, limit: 10 }),
    fetchMostRecentlyCuratedPost(currentUser),
    fetchPopularComments({ currentUser, limit: 3 }),
  ]);
  return (
    <div data-component="HomePageContent" className="w-full">
      <HomePageProvider
        search={search}
        initialFeaturedPosts={featuredPosts}
        curatedPost={curatedPost}
      >
        <HomePageTabs className="mb-5" />
        <HomePageFeaturedTab initialPopularComments={popularComments} />
      </HomePageProvider>
    </div>
  );
}
