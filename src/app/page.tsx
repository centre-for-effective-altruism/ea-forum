import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import { fetchCoreTags } from "@/lib/tags/tagQueries";
import StructuredData from "@/components/StructuredData";
import HomePageColumns from "@/components/HomePage/HomePageColumns";
import HomePageFeed from "@/components/HomePage/HomePageFeed";
import HomePageDefaultFeed from "@/components/HomePage/HomePageDefaultFeed";

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
  const coreTags = await fetchCoreTags();
  return (
    <HomePageColumns pageContext="homePage">
      <StructuredData data={structuredData} />
      <HomePageFeed defaultFeed={<HomePageDefaultFeed />} coreTags={coreTags} />
    </HomePageColumns>
  );
}
