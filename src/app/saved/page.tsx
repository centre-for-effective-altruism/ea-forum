import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import SavedPageContent from "@/components/SavedPage/SavedPageContent";
import PostsListSkeleton from "@/components/PostsList/PostsListSkeleton";
import Type from "@/components/Type";

export const metadata: Metadata = {
  title: "Saved & read",
  robots: "noindex",
};

export default function SavedPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  return (
    <AnalyticsContext pageContext="bookmarksPage">
      <div className="w-[765px] max-w-full mx-auto pt-6 pb-20 px-4 flex flex-col gap-4">
        <Type style="postsPageTitle">Saved & read</Type>
        <Suspense fallback={<PostsListSkeleton count={10} />}>
          <SavedPageContent searchParams={searchParams} />
        </Suspense>
      </div>
    </AnalyticsContext>
  );
}
