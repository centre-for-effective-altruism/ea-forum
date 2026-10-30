import { Suspense } from "react";
import type { Metadata } from "next";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { SearchPageProvider } from "@/components/Search/SearchPage/useSearchPage";
import SearchPageLayout from "@/components/Search/SearchPage/SearchPageLayout";
import SearchPageSkeleton from "@/components/Search/SearchPage/SearchPageSkeleton";

export const metadata: Metadata = {
  title: "Search",
  alternates: {
    canonical: combineUrls(getSiteUrl(), "/search"),
  },
};

export default function SearchPage() {
  return (
    <AnalyticsContext pageContext="searchPage">
      <Suspense fallback={<SearchPageSkeleton />}>
        <SearchPageProvider>
          <SearchPageLayout />
        </SearchPageProvider>
      </Suspense>
    </AnalyticsContext>
  );
}
