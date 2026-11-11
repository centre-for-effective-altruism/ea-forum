import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import HomePageColumns from "@/components/HomePage/HomePageColumns";
import ViewBasedPostsList from "@/components/PostsList/ViewBasedPostsList";
import PostsListSkeleton from "@/components/PostsList/PostsListSkeleton";
import Type from "@/components/Type";
import Link from "@/components/Link";

const upcomingEventsLimit = 20;

export const metadata: Metadata = {
  title: "Upcoming events",
  alternates: {
    canonical: combineUrls(getSiteUrl(), "/upcoming-events"),
  },
};

export default function UpcomingEventsPage() {
  return (
    <HomePageColumns pageContext="upcomingEventsPage">
      <div className="max-w-[765px] mx-auto flex flex-col gap-6 pb-20">
        <Type style="postsPageTitle">
          <Link href="/upcoming-events">Upcoming events</Link>
        </Type>
        <AnalyticsContext listContext="upcomingEvents" capturePostItemOnMount>
          <Suspense fallback={<PostsListSkeleton count={upcomingEventsLimit} />}>
            <ViewBasedPostsList
              view={{ view: "upcomingEvents", limit: upcomingEventsLimit }}
              cacheLoggedOut
            />
          </Suspense>
        </AnalyticsContext>
      </div>
    </HomePageColumns>
  );
}
