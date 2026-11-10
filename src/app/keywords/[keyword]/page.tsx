import { Suspense } from "react";
import type { Metadata } from "next";
import type { NextSearchParams } from "@/lib/typeHelpers";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import ArrowLeftIcon from "@heroicons/react/16/solid/ArrowLeftIcon";
import KeywordResultsContent from "@/components/Keywords/KeywordResultsContent";
import PostsListSkeleton from "@/components/PostsList/PostsListSkeleton";
import Type from "@/components/Type";
import Link from "@/components/Link";

type KeywordResultsPageProps = {
  params: Promise<{ keyword: string }>;
  searchParams: Promise<NextSearchParams>;
};

export async function generateMetadata({
  params,
}: KeywordResultsPageProps): Promise<Metadata> {
  const { keyword } = await params;
  return {
    title: `Alerts for "${decodeURIComponent(keyword)}"`,
    robots: "noindex",
  };
}

export default function KeywordResultsPage({
  params,
  searchParams,
}: Readonly<KeywordResultsPageProps>) {
  return (
    <AnalyticsContext pageContext="keywordResultsPage">
      <div className="w-[765px] max-w-full mx-auto pt-6 pb-20 px-4 flex flex-col gap-4">
        <Type style="bodySmall">
          <Link
            href="/keywords"
            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-1000"
          >
            <ArrowLeftIcon className="w-4" />
            Your keyword alerts
          </Link>
        </Type>
        <Suspense fallback={<PostsListSkeleton count={10} />}>
          <KeywordResultsContent params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </AnalyticsContext>
  );
}
