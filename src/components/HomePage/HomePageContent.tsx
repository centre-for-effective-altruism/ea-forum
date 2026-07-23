import { cookies } from "next/headers";
import {
  fetchFeaturedFrontpagePosts,
  fetchMostRecentlyCuratedPost,
} from "@/lib/posts/postLists";
import { fetchCurrentSpotlight } from "@/lib/spotlights/spotlightQueries";
import { fetchPopularComments } from "@/lib/comments/commentLists";
import { getCurrentHomePageTab } from "./homePageHelpers";
import { HomePageProvider } from "./HomePageContext";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchCoreTags } from "@/lib/tags/tagQueries";
import HomePageFeaturedTab from "./HomePageFeaturedTab";
import HomePageMagicTab from "./HomePageMagicTab";
import HomePageTabs from "./HomePageTabs";
import ViewBasedPostsList from "../PostsList/ViewBasedPostsList";
import FrontpagePostsList from "../PostsList/FrontpagePostsList";
import RecentDiscussionsSection from "./RecentDiscussions/RecentDiscussionsSection";
import PopularCommentsList from "./PopularCommentsList";
import FrontpageQuickTakesList from "../QuickTakes/FrontpageQuickTakesList";

export default async function HomePageContent() {
  const [cookieStore, currentUser] = await Promise.all([
    cookies(),
    getCurrentUser(),
  ]);
  const initialTab = getCurrentHomePageTab(cookieStore);
  const [featuredPosts, curatedPost, popularComments, coreTags, spotlight] =
    await Promise.all([
      fetchFeaturedFrontpagePosts({ currentUser, limit: 10 }),
      fetchMostRecentlyCuratedPost(currentUser),
      fetchPopularComments({ currentUser, limit: 3 }),
      fetchCoreTags(),
      fetchCurrentSpotlight(),
    ]);
  return (
    <div data-component="HomePageContent" className="w-full">
      <HomePageProvider
        initialTab={initialTab}
        initialFeaturedPosts={featuredPosts}
        curatedPost={curatedPost}
      >
        <HomePageTabs className="mb-5" />
        <HomePageFeaturedTab initialPopularComments={popularComments} />
        <HomePageMagicTab
          coreTags={coreTags}
          spotlight={spotlight}
          stickyPostsList={
            <ViewBasedPostsList
              viewType="list"
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
              viewType="fromContext"
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
      </HomePageProvider>
    </div>
  );
}
