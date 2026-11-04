import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import DraftsPageContent from "@/components/Drafts/DraftsPageContent";
import PostsListSkeleton from "@/components/PostsList/PostsListSkeleton";

export const metadata: Metadata = {
  title: "Drafts & unpublished",
  robots: "noindex",
};

export default function DraftsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  return (
    <AnalyticsContext pageContext="draftsPage" listContext="draftsPage">
      <div className="w-[765px] max-w-full mx-auto pt-6 pb-20 px-4">
        <Suspense fallback={<PostsListSkeleton count={10} />}>
          <DraftsPageContent searchParams={searchParams} />
        </Suspense>
      </div>
    </AnalyticsContext>
  );
}
