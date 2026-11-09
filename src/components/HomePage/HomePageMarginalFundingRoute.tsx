import { getCurrentUser } from "@/lib/users/currentUser";
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
  const [explainerPost, tag] = await Promise.all([
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
  return (
    <HomePageMarginalFundingTab
      explainerPost={explainerPost}
      tagId={tag?._id ?? null}
      cardPosts={posts.slice(0, MARGINAL_FUNDING_CARD_COUNT)}
      initialListPosts={posts.slice(MARGINAL_FUNDING_CARD_COUNT)}
      initialListLimit={MARGINAL_FUNDING_LIST_INITIAL_COUNT}
      loadMoreLimit={LOAD_MORE_LIMIT}
    />
  );
}
