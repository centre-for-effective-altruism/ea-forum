import { AnalyticsContext, AnalyticsInViewTracker } from "@/lib/analyticsEvents";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchRecentDiscussions } from "@/lib/recentDiscussions/fetchRecentDiscussions";
import RecentDiscussionsFeed from "./RecentDiscussionsFeed";

export default async function RecentDiscussionsSection() {
  const currentUser = await getCurrentUser();
  const data = await fetchRecentDiscussions({
    currentUser,
    limit: 10,
  });
  return (
    <AnalyticsContext pageSectionContext="recentDiscussion">
      <AnalyticsInViewTracker eventProps={{ inViewType: "recentDiscussion" }}>
        <RecentDiscussionsFeed data={data} />
      </AnalyticsInViewTracker>
    </AnalyticsContext>
  );
}
