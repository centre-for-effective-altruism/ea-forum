import { fetchFrontpagePopularCommentsAndQuickTakes } from "@/lib/comments/commentLists";
import {
  fetchFeaturedFrontpagePosts,
  fetchMostRecentlyCuratedPost,
} from "@/lib/posts/postLists";
import { HomePageDataProvider } from "./HomePageDataContext";
import { getCurrentUser } from "@/lib/users/currentUser";
import HomePageFeaturedTab from "./HomePageFeaturedTab";

export default async function HomePageFeaturedRoute() {
  const currentUser = await getCurrentUser();
  const [featuredPosts, curatedPost, popularComments] = await Promise.all([
    fetchFeaturedFrontpagePosts({ currentUser, limit: 10 }),
    fetchMostRecentlyCuratedPost(currentUser),
    fetchFrontpagePopularCommentsAndQuickTakes({ currentUser, limit: 6 }),
  ]);
  return (
    <HomePageDataProvider
      initialFeaturedPosts={featuredPosts}
      curatedPost={curatedPost}
      initialPopularCommentsAndQuickTakes={popularComments}
    >
      <HomePageFeaturedTab />
    </HomePageDataProvider>
  );
}
