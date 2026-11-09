import {
  fetchCachedFeaturedFrontpagePosts,
  fetchCachedMostRecentlyCuratedPost,
} from "@/lib/posts/cachedPostLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchCoreTags } from "@/lib/tags/tagQueries";
import FrontpageQuickTakesList from "../QuickTakes/FrontpageQuickTakesList";
import HomePageCommentsSections from "./HomePageCommentsSections";
import PopularCommentsList from "./PopularCommentsList";
import HomePageFeaturedTab from "./HomePageFeaturedTab";

export default async function HomePageFeaturedRoute() {
  const currentUser = await getCurrentUser();
  const [featuredPosts, curatedPost, coreTags] = await Promise.all([
    fetchCachedFeaturedFrontpagePosts(currentUser, 10),
    fetchCachedMostRecentlyCuratedPost(currentUser),
    fetchCoreTags(),
  ]);

  return (
    <HomePageFeaturedTab
      curatedPost={curatedPost}
      initialFeaturedPosts={featuredPosts}
      commentsSection={
        <HomePageCommentsSections
          coreTags={coreTags}
          popularCommentsList={<PopularCommentsList initialLimit={3} />}
          quickTakesList={<FrontpageQuickTakesList initialLimit={5} />}
        />
      }
    />
  );
}
