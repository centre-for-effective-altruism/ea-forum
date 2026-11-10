import { Suspense } from "react";
import type { Metadata } from "next";
import type { NextSearchParams } from "@/lib/typeHelpers";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import KeywordsPageContent from "@/components/Keywords/KeywordsPageContent";
import Loading from "@/components/Loading";
import Type from "@/components/Type";

export const metadata: Metadata = {
  title: "Keyword alerts",
  robots: "noindex",
};

export default function KeywordsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<NextSearchParams>;
}>) {
  return (
    <AnalyticsContext pageContext="keywordsPage">
      <div className="w-[765px] max-w-full mx-auto pt-6 pb-20 px-4 flex flex-col gap-4">
        <Type style="postsPageTitle">Keyword alerts</Type>
        <Suspense fallback={<Loading />}>
          <KeywordsPageContent searchParams={searchParams} />
        </Suspense>
      </div>
    </AnalyticsContext>
  );
}
