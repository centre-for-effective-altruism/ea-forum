import { fetchSidebarOpportunities } from "@/lib/posts/postLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import HomeSidebarPost from "./HomeSidebarPost";

export default async function HomeSidebarOpportunitiesList({
  count,
}: Readonly<{
  count: number;
}>) {
  const currentUser = await getCurrentUser();
  const opportunities = await fetchSidebarOpportunities(
    currentUser?._id ?? null,
    count,
  );
  return (
    <>
      {opportunities.map((post) => (
        <HomeSidebarPost post={post} key={post._id} />
      ))}
    </>
  );
}
