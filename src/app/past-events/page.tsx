import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import HomePageColumns from "@/components/HomePage/HomePageColumns";
import PastEventsList from "@/components/Events/PastEventsList";
import PostsListSkeleton from "@/components/PostsList/PostsListSkeleton";
import Type from "@/components/Type";
import Link from "@/components/Link";

export const metadata: Metadata = {
  title: "Past events by day",
  alternates: {
    canonical: combineUrls(getSiteUrl(), "/past-events"),
  },
};

export default function PastEventsPage() {
  return (
    <HomePageColumns pageContext="pastEventsPage">
      <div className="max-w-[765px] mx-auto flex flex-col gap-6 pb-20">
        <Type style="postsPageTitle">
          <Link href="/past-events">Past events by day</Link>
        </Type>
        <AnalyticsContext listContext="pastEvents">
          <Suspense fallback={<PostsListSkeleton count={10} />}>
            <PastEventsList />
          </Suspense>
        </AnalyticsContext>
      </div>
    </HomePageColumns>
  );
}
