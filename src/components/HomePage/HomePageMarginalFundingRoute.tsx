import orderBy from "lodash/orderBy";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchCachedPostsListById } from "@/lib/posts/cachedPostLists";
import { fetchCachedSequenceEventPage } from "@/lib/sequences/sequenceEventQueries";
import {
  marginalFundingWeekExplainerPostId,
  marginalFundingWeekSequenceId,
} from "@/lib/marginalFundingWeek";
import { MARGINAL_FUNDING_CARD_COUNT } from "./HomePageMarginalFundingTabLayout";
import HomePageMarginalFundingTab from "./HomePageMarginalFundingTab";

export default async function HomePageMarginalFundingRoute() {
  const currentUser = await getCurrentUser();
  const [explainerPost, sequenceData] = await Promise.all([
    fetchCachedPostsListById(
      currentUser?._id ?? null,
      marginalFundingWeekExplainerPostId,
    ),
    fetchCachedSequenceEventPage({
      currentUser,
      sequenceId: marginalFundingWeekSequenceId,
      order: "sequence",
    }),
  ]);
  if (!sequenceData) {
    console.warn("Marginal Funding Week sequence not found");
  }
  const posts = orderBy(
    (sequenceData?.posts ?? []).filter(
      ({ _id }) => _id !== marginalFundingWeekExplainerPostId,
    ),
    "baseScore",
    "desc",
  );
  return (
    <HomePageMarginalFundingTab
      explainerPost={explainerPost}
      cardPosts={posts.slice(0, MARGINAL_FUNDING_CARD_COUNT)}
      listPosts={posts.slice(MARGINAL_FUNDING_CARD_COUNT)}
    />
  );
}
