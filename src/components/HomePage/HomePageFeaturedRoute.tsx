import { cookies } from "next/headers";
import {
  fetchFeaturedFrontpagePosts,
  fetchMostRecentlyCuratedPost,
} from "@/lib/posts/postLists";
import {
  defaultFeaturedViewType,
  featuredViewTypeCookie,
  isPostsListViewType,
} from "@/lib/posts/postsListView";
import { PostsListViewProvider } from "@/lib/hooks/usePostsListView";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchCoreTags } from "@/lib/tags/tagQueries";
import FrontpageQuickTakesList from "../QuickTakes/FrontpageQuickTakesList";
import HomePageCommentsSections from "./HomePageCommentsSections";
import PopularCommentsList from "./PopularCommentsList";
import HomePageFeaturedTab from "./HomePageFeaturedTab";

export default async function HomePageFeaturedRoute() {
  const currentUser = await getCurrentUser();
  const [cookieStore, featuredPosts, curatedPost, coreTags] = await Promise.all([
    cookies(),
    fetchFeaturedFrontpagePosts({ currentUser, limit: 10 }),
    fetchMostRecentlyCuratedPost(currentUser),
    fetchCoreTags(),
  ]);

  const viewCookie = cookieStore.get(featuredViewTypeCookie)?.value ?? "";
  const ssrView = isPostsListViewType(viewCookie) ? viewCookie : undefined;

  return (
    <PostsListViewProvider
      cookieName="featured_view_type"
      defaultValue={defaultFeaturedViewType}
      ssrValue={ssrView}
    >
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
    </PostsListViewProvider>
  );
}
