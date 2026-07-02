import { Suspense } from "react";
import type { NextSearchParams } from "@/lib/typeHelpers";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import StructuredData from "@/components/StructuredData";
import BotSiteNotice from "@/components/HomePage/BotSiteNotice";
import HomePageColumns from "@/components/HomePage/HomePageColumns";
import HomePageFeedSkeleton from "@/components/HomePage/HomePageFeedSkeleton";
import HomePageFeed from "@/components/HomePage/HomePageFeed";
import HomePageTabBarSkeleton from "@/components/HomePage/HomePageTagBarSkeleton";
import HomePageTagBar from "@/components/HomePage/HomePageTagBar";
import SpotlightBox from "@/components/Spotlights/SpotlightBox";

const structuredData = {
  "@context": "http://schema.org",
  "@type": "WebSite",
  url: getSiteUrl(),
  potentialAction: {
    "@type": "SearchAction",
    target: `${combineUrls(getSiteUrl(), "/search")}?query={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": getSiteUrl(),
  },
  description: [
    "A forum for discussions and updates on effective altruism. Topics covered",
    "include global health, AI safety, biosecurity, animal welfare, philosophy,",
    "policy, forecasting,and effective giving. Users can explore new posts,",
    "engage with the community, participate in recent discussions, and discover",
    "topics, events, and groups. An accessible space for sharing and learning",
    "about approaches to tackling the world's most pressing problems.",
  ].join(" "),
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<NextSearchParams>;
}) {
  const search = await searchParams;
  return (
    <HomePageColumns pageContext="homePage">
      <StructuredData data={structuredData} />
      <BotSiteNotice />
      <Suspense fallback={<HomePageTabBarSkeleton className="mb-4" />}>
        <HomePageTagBar className="mb-4" />
      </Suspense>
      {/* Intentionally no fallback: this usually renders nothing (no active
          spotlight), so a skeleton would reserve space that often stays empty */}
      <Suspense>
        <SpotlightBox className="mb-4" />
      </Suspense>
      <Suspense
        // This key forces react to render the fallback when navigating on the
        // client instead of waiting for the server response
        key={typeof search.tab === "string" ? search.tab : "frontpage"}
        fallback={<HomePageFeedSkeleton postCount={30} />}
      >
        <HomePageFeed search={search} />
      </Suspense>
    </HomePageColumns>
  );
}
