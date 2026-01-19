import { AnalyticsContext, AnalyticsInViewTracker } from "@/lib/analyticsEvents";
import { getCurrentUser } from "@/lib/users/currentUser";
import {
  fetchRecentDiscussions,
  RecentDiscussionRevision,
} from "@/lib/recentDiscussions/fetchRecentDiscussions";
import RecentDiscussionsPostCommented from "./RecentDiscussionsPostCommented";
import RecentDiscussionsTagRevised from "./RecentDiscussionsTagRevised";

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
                return (
                  <RecentDiscussionsTagRevised
                    revision={item as RecentDiscussionRevision}
                    key={key}
                  />
                );
              case "subscribeReminder":
              // TODO
              default:
                console.warn("Invalid recent discussions item type:", type);
                return null;
            }
          })}
        </div>
      </AnalyticsInViewTracker>
    </AnalyticsContext>
  );
}
