import { AnalyticsContext } from "@/lib/analyticsEvents";
import {
  fetchFrontpageCuratedPostsList,
  fetchPostsListFromView,
} from "@/lib/posts/postLists";
import { HideRepeatedPostsProvider } from "@/lib/hooks/useHideRepeatedPosts";
import { getDefaultFilterSettings } from "@/lib/filterSettings";
import { getCurrentUser } from "@/lib/users/currentUser";
import ClientFrontpagePostsList from "./ClientFrontpagePostsList";
import PostsList from "./PostsList";
import TextLinkButton from "../TextLinkButton";

export default async function FrontpagePostsList() {
  const currentUser = await getCurrentUser();
  const view = {
    view: "frontpage",
    limit: 11,
    excludeTagId: process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID,
    filterSettings:
      currentUser?.frontpageFilterSettings ?? getDefaultFilterSettings(),
  } as const;
  const [curatedPosts, posts] = await Promise.all([
    fetchFrontpageCuratedPostsList(currentUser?._id ?? null),
    fetchPostsListFromView(currentUser?._id ?? null, view),
  ]);
  return (
    <HideRepeatedPostsProvider>
      <AnalyticsContext listContext="curatedPosts">
        <PostsList
          posts={curatedPosts}
          viewType="fromContext"
          curatedIconLeft
          className={curatedPosts.length ? "mb-[2px]" : undefined}
        />
      </AnalyticsContext>
      <AnalyticsContext listContext="latestPosts">
        <ClientFrontpagePostsList
          posts={posts}
          view={view}
          bottomRightNode={
            <TextLinkButton variant="primary" href="/allPosts">
              Advanced sorting & filtering
            </TextLinkButton>
          }
        />
      </AnalyticsContext>
    </HideRepeatedPostsProvider>
  );
}
