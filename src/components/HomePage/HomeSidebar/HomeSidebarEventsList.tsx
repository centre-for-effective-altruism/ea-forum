import { fetchSidebarEvents } from "@/lib/posts/postLists";
import HomeSidebarEvent from "./HomeSidebarEvent";

export default async function HomeSidebarEventsList({
  count,
}: Readonly<{
  count: number;
}>) {
  const opportunities = await fetchSidebarEvents(count);
  return (
    <>
      {opportunities.map((post) => (
        <HomeSidebarEvent post={post} key={post._id} />
      ))}
    </>
  );
}
