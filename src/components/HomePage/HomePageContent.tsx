import type { NextSearchParams } from "@/lib/typeHelpers";
import {
  fetchFeaturedFrontpagePosts,
  fetchMostRecentlyCuratedPost,
} from "@/lib/posts/postLists";
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
  const [featuredPosts, curatedPost] = await Promise.all([
    fetchFeaturedFrontpagePosts({ currentUser, limit: 10 }),
    fetchMostRecentlyCuratedPost(currentUser),
  ]);
  return (
    <HomePageProvider
      search={search}
      initialFeaturedPosts={featuredPosts}
      curatedPost={curatedPost}
    >
      <HomePageTabs className="mb-5" />
      <HomePageFeaturedTab />
    </HomePageProvider>
  );
}
