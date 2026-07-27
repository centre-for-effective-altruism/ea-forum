import {
  fetchFeaturedFrontpagePosts,
  fetchMostRecentlyCuratedPost,
} from "@/lib/posts/postLists";
import { fetchFrontpagePopularCommentsAndQuickTakes } from "@/lib/comments/commentLists";
import { fetchCurrentSpotlight } from "@/lib/spotlights/spotlightQueries";
import { HomePageDataProvider } from "./HomePageDataContext";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchCoreTags } from "@/lib/tags/tagQueries";
import HomePageFeaturedTab from "./HomePageFeaturedTab";
import HomePageMagicTab from "./HomePageMagicTab";
import ViewBasedPostsList from "../PostsList/ViewBasedPostsList";
import FrontpagePostsList from "../PostsList/FrontpagePostsList";
import RecentDiscussionsSection from "./RecentDiscussions/RecentDiscussionsSection";
import PopularCommentsList from "./PopularCommentsList";
import FrontpageQuickTakesList from "../QuickTakes/FrontpageQuickTakesList";

export default async function HomePageContent() {
  const currentUser = await getCurrentUser();
  const [featuredPosts, curatedPost, popularComments, coreTags, spotlight] =
    await Promise.all([
      fetchFeaturedFrontpagePosts({ currentUser, limit: 10 }),
      fetchMostRecentlyCuratedPost(currentUser),
      fetchFrontpagePopularCommentsAndQuickTakes({ currentUser, limit: 6 }),
      fetchCoreTags(),
      fetchCurrentSpotlight(),
    ]);
  return (
    <div data-component="HomePageContent">
      <HomePageDataProvider
        initialFeaturedPosts={featuredPosts}
        curatedPost={curatedPost}
        initialPopularCommentsAndQuickTakes={popularComments}
      >
        <HomePageFeaturedTab />
        <HomePageMagicTab
          coreTags={coreTags}
          spotlight={spotlight}
          stickyPostsList={
            <ViewBasedPostsList
              hideLoadMore
              view={{
                view: "sticky",
                limit: 5,
              }}
            />
          }
          frontpagePostsList={<FrontpagePostsList />}
          communityPostsList={
            <ViewBasedPostsList
              hideLoadMore
              view={{
                view: "frontpage",
                limit: 5,
                onlyTagId: process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID,
              }}
            />
          }
          quickTakesList={<FrontpageQuickTakesList initialLimit={5} />}
          popularCommentsList={<PopularCommentsList initialLimit={3} />}
          recentDiscussions={<RecentDiscussionsSection />}
        />
      </HomePageDataProvider>
    </div>
  );
}
