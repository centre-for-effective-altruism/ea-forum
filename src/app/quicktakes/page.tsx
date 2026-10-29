import { Suspense } from "react";
import type { Metadata } from "next";
import { combineUrls, getSiteUrl } from "@/lib/routeHelpers";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { QuickTakesListProvider } from "@/components/QuickTakes/QuickTakesListContext";
import RecentlyActiveQuickTakesList from "@/components/QuickTakes/RecentlyActiveQuickTakesList";
import QuickTakesListSkeleton from "@/components/QuickTakes/QuickTakesListSkeleton";
import NewQuickTakeWithCoreTags from "@/components/QuickTakes/NewQuickTakeWithCoreTags";
import NewQuickTakeSkeleton from "@/components/QuickTakes/NewQuickTakeSkeleton";
import HomePageColumns from "@/components/HomePage/HomePageColumns";
import Type from "@/components/Type";
import Link from "@/components/Link";
import RequestCookiesProvider from "@/components/Cookies/RequestCookiesProvider";

const initialLimit = 20;

export const metadata: Metadata = {
  title: "Quick takes",
  alternates: {
    canonical: combineUrls(getSiteUrl(), "/quicktakes"),
  },
};

export default function QuickTakesPage() {
  return (
    <HomePageColumns pageContext="shortformPage">
      <div className="max-w-[680px] mx-auto flex flex-col gap-4 pb-20">
        <Type style="postsPageTitle">
          <Link href="/quicktakes">Quick takes</Link>
        </Type>
        <AnalyticsContext listContext="shortformPage">
          <Suspense
            fallback={
              <>
                <NewQuickTakeSkeleton />
                <div>
                  <QuickTakesListSkeleton count={initialLimit} />
                </div>
              </>
            }
          >
            <RequestCookiesProvider>
              <QuickTakesListProvider>
                <Suspense fallback={<NewQuickTakeSkeleton />}>
                  <NewQuickTakeWithCoreTags />
                </Suspense>
                <Suspense
                  fallback={
                    <div>
                      <QuickTakesListSkeleton count={initialLimit} />
                    </div>
                  }
                >
                  <RecentlyActiveQuickTakesList initialLimit={initialLimit} />
                </Suspense>
              </QuickTakesListProvider>
            </RequestCookiesProvider>
          </Suspense>
        </AnalyticsContext>
      </div>
    </HomePageColumns>
  );
}
