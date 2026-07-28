import { Suspense } from "react";
import { cookies } from "next/headers";
import { getPostHogClient, getPostHogDistinctId } from "@/lib/posthog-server";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import { getCurrentHomePageTab } from "@/components/HomePage/homePageHelpers";
import { isPostsListViewType } from "@/lib/posts/postsListView";
import HomePageTabSkeleton from "@/components/HomePage/HomePageTabSkeleton";
import HomePageTabContent from "@/components/HomePage/HomePageTabContent";
import HomePageColumns from "@/components/HomePage/HomePageColumns";
import BotSiteNotice from "@/components/HomePage/BotSiteNotice";
import HomePageTabs from "@/components/HomePage/HomePageTabs";
import StructuredData from "@/components/StructuredData";

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

export default async function HomePage() {
  const [cookieStore, posthogDistinctId] = await Promise.all([
    cookies(),
    getPostHogDistinctId(),
  ]);
  const flags = await getPostHogClient()?.evaluateFlags(posthogDistinctId);
  const testGroup = flags?.getFlag("default-frontpage-tab") as string | undefined;
  const initialTab = getCurrentHomePageTab(cookieStore, testGroup);
  const featuredViewCookie = cookieStore.get("featured_view_type")?.value ?? "";
  const featuredView = isPostsListViewType(featuredViewCookie)
    ? featuredViewCookie
    : undefined;
  return (
    <HomePageColumns pageContext="homePage">
      <StructuredData data={structuredData} />
      <BotSiteNotice />
      <HomePageTabs
        testGroup={testGroup}
        initialContent={
          <Suspense
            fallback={
              <HomePageTabSkeleton tab={initialTab} featuredView={featuredView} />
            }
          >
            <HomePageTabContent tab={initialTab} />
          </Suspense>
        }
        className="mb-5"
      />
    </HomePageColumns>
  );
}
