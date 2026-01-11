import { fetchSidebarOpportunities } from "@/lib/posts/postLists";
import HomeSidebarPost from "./HomeSidebarPost";

export default async function HomeSidebarOpportunitiesList({
  count,
}: Readonly<{
  count: number;
}>) {
  const opportunities = await fetchSidebarOpportunities(count);
  return (
    <>
      {opportunities.map((post) => (
        <HomeSidebarPost post={post} key={post._id} />
      ))}
    </>
  );
}
