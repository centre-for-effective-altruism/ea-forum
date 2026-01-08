import { Suspense } from "react";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import StructuredData from "@/components/StructuredData";
import HomePageColumns from "@/components/HomePageColumns";
import PostsListSkeleton from "@/components/PostsList/PostsListSkeleton";
import FrontpagePostsList from "@/components/PostsList/FrontpagePostsList";
import QuickTakesListSkeleton from "@/components/QuickTakes/QuickTakesListSkeleton";
import FrontpageQuickTakesList from "@/components/QuickTakes/FrontpageQuickTakesList";
import Type from "@/components/Type";

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

export default function HomePage() {
  return (
    <HomePageColumns pageContext="homePage">
      <StructuredData data={structuredData} />
      <Type className="mb-2" style="sectionTitleLarge">
        New &amp; upvoted
      </Type>
      <div className="mb-10">
        <Suspense fallback={<PostsListSkeleton count={11} />}>
          <FrontpagePostsList initialLimit={11} />
        </Suspense>
      </div>
      <Type className="mb-2" style="sectionTitleLarge">
        Posts tagged community
      </Type>
      <div className="mb-10">
        <Suspense fallback={<PostsListSkeleton count={5} />}>
          <FrontpagePostsList initialLimit={5} community />
        </Suspense>
      </div>
      <Type className="mb-2" style="sectionTitleLarge">
        Quick takes
      </Type>
      <div className="mb-10">
        <Suspense fallback={<QuickTakesListSkeleton count={5} />}>
          <FrontpageQuickTakesList initialLimit={5} />
        </Suspense>
      </div>
      <Type className="mb-2" style="sectionTitleLarge">
        Popular comments
      </Type>
      <div className="mb-10">TODO: Popular comments list</div>
      <Type className="mb-2" style="sectionTitleLarge">
        Recent discussion
      </Type>
      <div>TODO: Recent discussions list</div>
    </HomePageColumns>
  );
}
