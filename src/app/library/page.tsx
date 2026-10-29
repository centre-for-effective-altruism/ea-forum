import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import CoreReadingList from "@/components/Sequences/CoreReadingList";
import CommunitySequencesList from "@/components/Sequences/CommunitySequencesList";
import SequencesGridSkeleton from "@/components/Sequences/SequencesGridSkeleton";
import NewSequenceButton from "@/components/Sequences/NewSequenceButton";
import Type from "@/components/Type";

const initialLimit = 12;

export const metadata: Metadata = {
  title: "Library",
  description: "Featured readings and collections of posts on specific topics.",
};

export default function LibraryPage() {
  return (
    <AnalyticsContext pageContext="eaSequencesHome">
      <div className="w-[765px] max-w-full mx-auto py-12 px-4 flex flex-col gap-10">
        <AnalyticsContext pageSectionContext="coreReading">
          <section>
            <Type style="sectionTitleSmall" className="mb-3">
              Core Reading
            </Type>
            <CoreReadingList />
          </section>
        </AnalyticsContext>
        <AnalyticsContext pageSectionContext="communitySequences">
          <section>
            <div className="flex gap-4 items-center justify-between mb-3">
              <Type style="sectionTitleSmall">Sequences</Type>
              <Suspense>
                <NewSequenceButton />
              </Suspense>
            </div>
            <Type className="mb-4">
              Sequences are collections of posts on a common theme, or that build on
              each other. They help authors to develop ideas in ways that would be
              difficult in a single post. You can also add posts written by other
              people to a sequence if you think they should be read together.
            </Type>
            <Suspense fallback={<SequencesGridSkeleton count={initialLimit} />}>
              <CommunitySequencesList initialLimit={initialLimit} />
            </Suspense>
          </section>
        </AnalyticsContext>
      </div>
    </AnalyticsContext>
  );
}
