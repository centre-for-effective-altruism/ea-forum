import { Suspense } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import type { Metadata } from "next";
import range from "lodash/range";
import EditTagWikiButton from "@/components/Tags/EditTagWikiButton";
import CoreTagsList from "@/components/Tags/CoreTagsList";
import NewTagButton from "@/components/Tags/NewTagButton";
import AllTagsList from "@/components/Tags/AllTagsList";
import TagWiki from "@/components/Tags/TagWiki";
import Type from "@/components/Type";

export const metadata: Metadata = {
  title: "Topics",
};

export default function TopicsPage() {
  return (
    <AnalyticsContext pageContext="allTagsPage">
      <div className="w-[800px] max-w-full mx-auto py-12 px-2 flex flex-col gap-10">
        <AnalyticsContext pageSectionContext="coreTagsSection">
          <section>
            <Type style="sectionTitleSmall" className="mb-3">
              Core Topics
            </Type>
            <Suspense
              fallback={
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {range(8).map((i) => (
                    <div key={i} className="rounded bg-gray-300 p-4">
                      <div className="w-full h-[85px]" />
                    </div>
                  ))}
                </div>
              }
            >
              <CoreTagsList initialCount={8} />
            </Suspense>
          </section>
        </AnalyticsContext>
        <AnalyticsContext pageSectionContext="tagsInfoSection">
          <section>
            <div className="flex gap-4 items-center justify-between mb-3">
              <Type style="sectionTitleSmall">EA Forum Topics Wiki</Type>
              <div className="flex items-center gap-4">
                <EditTagWikiButton />
                <NewTagButton />
              </div>
            </div>
            <Suspense fallback={<div className="h-[400px] rounded bg-gray-300" />}>
              <TagWiki />
            </Suspense>
          </section>
        </AnalyticsContext>
        <AnalyticsContext pageSectionContext="allTagsAlphabetical">
          <section>
            <div className="flex gap-4 items-center justify-between mb-3">
              <Type style="sectionTitleSmall">All Topics</Type>
              <NewTagButton />
            </div>
            <Suspense fallback={<div className="h-[1000px] rounded bg-gray-300" />}>
              <AllTagsList />
            </Suspense>
          </section>
        </AnalyticsContext>
      </div>
    </AnalyticsContext>
  );
}
