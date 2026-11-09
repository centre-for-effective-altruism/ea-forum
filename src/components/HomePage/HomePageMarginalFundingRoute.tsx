import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchCachedPostsListById } from "@/lib/posts/cachedPostLists";
import { marginalFundingWeekExplainerPostId } from "@/lib/marginalFundingWeek";
import HomePageMarginalFundingTab from "./HomePageMarginalFundingTab";

export default async function HomePageMarginalFundingRoute() {
  const currentUser = await getCurrentUser();
  const explainerPost = await fetchCachedPostsListById(
    currentUser?._id ?? null,
    marginalFundingWeekExplainerPostId,
  );
  return <HomePageMarginalFundingTab explainerPost={explainerPost} />;
}
