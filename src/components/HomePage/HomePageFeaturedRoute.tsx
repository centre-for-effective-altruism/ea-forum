import { cookies } from "next/headers";
import { fetchFrontpagePopularCommentsAndQuickTakes } from "@/lib/comments/commentLists";
import {
  fetchFeaturedFrontpagePosts,
  fetchMostRecentlyCuratedPost,
} from "@/lib/posts/postLists";
import {
  defaultFeaturedViewType,
  isPostsListViewType,
} from "@/lib/posts/postsListView";
import { PostsListViewProvider } from "@/lib/hooks/usePostsListView";
import { getCurrentUser } from "@/lib/users/currentUser";
import HomePageFeaturedTab from "./HomePageFeaturedTab";

export default async function HomePageFeaturedRoute() {
  const currentUser = await getCurrentUser();
  const [cookieStore, featuredPosts, curatedPost, popularComments] =
    await Promise.all([
      cookies(),
      fetchFeaturedFrontpagePosts({ currentUser, limit: 10 }),
      fetchMostRecentlyCuratedPost(currentUser),
      fetchFrontpagePopularCommentsAndQuickTakes({ currentUser, limit: 6 }),
    ]);

  const viewCookie = cookieStore.get("featured_view_type")?.value ?? "";
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
        initialPopularCommentsAndQuickTakes={popularComments}
      />
    </PostsListViewProvider>
  );
}
