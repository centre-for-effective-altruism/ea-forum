import { Suspense } from "react";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import type { NextSearchParams } from "@/lib/typeHelpers";
import StructuredData from "@/components/StructuredData";
import BotSiteNotice from "@/components/HomePage/BotSiteNotice";
import HomePageColumns from "@/components/HomePage/HomePageColumns";
import HomePageContent from "@/components/HomePage/HomePageContent";

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
      <Suspense>
        <HomePageContent search={search} />
      </Suspense>
    </HomePageColumns>
  );
}
