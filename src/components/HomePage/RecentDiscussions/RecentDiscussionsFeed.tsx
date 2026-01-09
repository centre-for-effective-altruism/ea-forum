import { AnalyticsContext, AnalyticsInViewTracker } from "@/lib/analyticsEvents";
import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchRecentDiscussions } from "@/lib/recentDiscussions/fetchRecentDiscussions";
import RecentDiscussionsPostCommented from "./RecentDiscussionsPostCommented";

export default async function RecentDiscussionsFeed() {
  const currentUser = await getCurrentUser();
  const items = await fetchRecentDiscussions({
    currentUser,
    limit: 10,
  });
  return (
    <AnalyticsContext pageSectionContext="recentDiscussion">
      <AnalyticsInViewTracker eventProps={{ inViewType: "recentDiscussion" }}>
        <div>
          {items.results.map(({ type, sortKey, item }) => {
            const key = type + sortKey;
            switch (type) {
              case "postCommented":
                return <RecentDiscussionsPostCommented post={item} key={key} />;
              case "newQuickTake":
              // TODO
              case "quickTakeCommented":
              // TODO
              case "tagDiscussed":
              // TODO
              case "tagRevised":
              // TODO
              case "subscribeReminder":
              // TODO
              default:
                console.error("Invalid recent discussions item type:", type);
                return null;
            }
          })}
        </div>
      </AnalyticsInViewTracker>
    </AnalyticsContext>
  );
}
