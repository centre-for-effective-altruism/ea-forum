"use client";

import { ReactNode, Suspense } from "react";
import type { TagBase } from "@/lib/tags/tagQueries";
import HomePagePopularCommentsSection from "./HomePagePopularCommentsSection";
import QuickTakesListSkeleton from "../QuickTakes/QuickTakesListSkeleton";
import HomePageQuickTakesSection from "./HomePageQuickTakesSection";

export default function HomePageCommentsSections({
  coreTags,
  popularCommentsList,
  quickTakesList,
  className,
}: Readonly<{
  coreTags: TagBase[];
  popularCommentsList: ReactNode;
  quickTakesList: ReactNode;
  className?: string;
}>) {
  return (
    <div className={className}>
      <HomePagePopularCommentsSection className="mb-10">
        <Suspense fallback={<QuickTakesListSkeleton count={3} />}>
          {popularCommentsList}
        </Suspense>
      </HomePagePopularCommentsSection>
      <HomePageQuickTakesSection coreTags={coreTags}>
        <Suspense fallback={<QuickTakesListSkeleton count={5} />}>
          {quickTakesList}
        </Suspense>
      </HomePageQuickTakesSection>
    </div>
  );
}
