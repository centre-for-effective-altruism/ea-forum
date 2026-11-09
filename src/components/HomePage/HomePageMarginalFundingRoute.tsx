import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/users/currentUser";
import { PostsListViewProvider } from "@/lib/hooks/usePostsListView";
import {
  defaultFeaturedViewType,
  featuredViewTypeCookie,
  isPostsListViewType,
} from "@/lib/posts/postsListView";
import { fetchTagBySlug } from "@/lib/tags/tagQueries";
import {
  fetchCachedPostsListById,
  fetchCachedTagPostsList,
} from "@/lib/posts/cachedPostLists";
import {
  marginalFundingWeekExplainerPostId,
  marginalFundingWeekTagSlug,
} from "@/lib/marginalFundingWeek";
import {
  MARGINAL_FUNDING_CARD_COUNT,
  MARGINAL_FUNDING_LIST_INITIAL_COUNT,
} from "./HomePageMarginalFundingTabLayout";
import HomePageMarginalFundingTab from "./HomePageMarginalFundingTab";

const LOAD_MORE_LIMIT = 50;

export default async function HomePageMarginalFundingRoute() {
  const currentUser = await getCurrentUser();
  const [cookieStore, explainerPost, tag] = await Promise.all([
    cookies(),
    fetchCachedPostsListById(
      currentUser?._id ?? null,
      marginalFundingWeekExplainerPostId,
    ),
    fetchTagBySlug(marginalFundingWeekTagSlug),
  ]);
  if (!tag) {
    console.warn("Marginal Funding Week tag not found by slug");
  }
  const posts = tag
    ? await fetchCachedTagPostsList(currentUser, {
        tagId: tag._id,
        sortedBy: "top",
        excludePostId: marginalFundingWeekExplainerPostId,
        limit: MARGINAL_FUNDING_CARD_COUNT + MARGINAL_FUNDING_LIST_INITIAL_COUNT,
      })
    : [];
  const viewCookie = cookieStore.get(featuredViewTypeCookie)?.value ?? "";
  const ssrView = isPostsListViewType(viewCookie) ? viewCookie : undefined;
  return (
    <PostsListViewProvider
      cookieName={featuredViewTypeCookie}
      defaultValue={defaultFeaturedViewType}
      ssrValue={ssrView}
    >
      <HomePageMarginalFundingTab
        explainerPost={explainerPost}
        tagId={tag?._id ?? null}
        cardPosts={posts.slice(0, MARGINAL_FUNDING_CARD_COUNT)}
        initialListPosts={posts.slice(MARGINAL_FUNDING_CARD_COUNT)}
        initialListLimit={MARGINAL_FUNDING_LIST_INITIAL_COUNT}
        loadMoreLimit={LOAD_MORE_LIMIT}
      />
    </PostsListViewProvider>
  );
}
