import { fetchCurrentSpotlight } from "@/lib/spotlights/spotlightQueries";
import { fetchCoreTags } from "@/lib/tags/tagQueries";
import RecentDiscussionsSection from "./RecentDiscussions/RecentDiscussionsSection";
import FrontpageQuickTakesList from "../QuickTakes/FrontpageQuickTakesList";
import ViewBasedPostsList from "../PostsList/ViewBasedPostsList";
import FrontpagePostsList from "../PostsList/FrontpagePostsList";
import PopularCommentsList from "./PopularCommentsList";
import HomePageMagicTab from "./HomePageMagicTab";

export default async function HomePageMagicRoute() {
  const [coreTags, spotlight] = await Promise.all([
    fetchCoreTags(),
    fetchCurrentSpotlight(),
  ]);
  return (
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
  );
}
