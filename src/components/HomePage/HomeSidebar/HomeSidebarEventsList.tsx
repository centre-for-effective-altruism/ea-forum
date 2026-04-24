import { fetchSidebarEvents } from "@/lib/posts/postLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import HomeSidebarEvent from "./HomeSidebarEvent";

export default async function HomeSidebarEventsList({
  count,
}: Readonly<{
  count: number;
}>) {
  const currentUser = await getCurrentUser();
  const events = await fetchSidebarEvents(currentUser?._id ?? null, count);
  return (
    <>
      {events.map((post) => (
        <HomeSidebarEvent post={post} key={post._id} />
      ))}
    </>
  );
}
