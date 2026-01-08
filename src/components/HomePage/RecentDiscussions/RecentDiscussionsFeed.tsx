import { fetchRecentDiscussions } from "@/lib/recentDiscussions/fetchRecentDiscussions";
import { getCurrentUser } from "@/lib/users/currentUser";

export default async function RecentDiscussionsFeed() {
  const currentUser = await getCurrentUser();
  const recentDiscussions = await fetchRecentDiscussions({
    currentUser,
    limit: 20,
  });
  // TODO
  // eslint-disable-next-line no-console
  console.log("recent discussions", JSON.stringify(recentDiscussions, null, 2));
  return null;
}
