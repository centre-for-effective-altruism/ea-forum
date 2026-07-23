"use client";

import { ReactNode, Suspense } from "react";
import type { SpotlightBase } from "@/lib/spotlights/spotlightQueries";
import type { TagBase } from "@/lib/tags/tagQueries";
import { FilterSettingsProvider } from "@/lib/hooks/useFilterSettings";
import { useHomePage } from "./HomePageContext";
import HomePagePopularCommentsSection from "./HomePagePopularCommentsSection";
import QuickTakesListSkeleton from "../QuickTakes/QuickTakesListSkeleton";
import HomePageQuickTakesSection from "./HomePageQuickTakesSection";
import HomePageCommunitySection from "./HomePageCommunitySection";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import FilterSettingsToggle from "./FilterSettingsToggle";
import FilterSettingsEditor from "./FilterSettingsEditor";
import Spotlight from "../Spotlights/Spotlight";
import Type from "../Type";

export default function HomePageMagicTab({
  coreTags,
  spotlight,
  stickyPostsList,
  frontpagePostsList,
  communityPostsList,
  quickTakesList,
  popularCommentsList,
  recentDiscussions,
}: Readonly<{
  coreTags: TagBase[];
  spotlight: SpotlightBase | null;
  stickyPostsList: ReactNode;
  frontpagePostsList: ReactNode;
  communityPostsList: ReactNode;
  quickTakesList: ReactNode;
  popularCommentsList: ReactNode;
  recentDiscussions: ReactNode;
}>) {
  const { currentTab } = useHomePage();
  if (currentTab !== "magic") {
    return null;
  }

  return (
    <div data-component="HomePageMagicTab">
      {spotlight && <Spotlight spotlight={spotlight} className="mt-6 mb-4" />}
      <FilterSettingsProvider>
        <div className="mb-2 flex items-center justify-between">
          <Type style="sectionTitleLarge">New &amp; upvoted</Type>
          <FilterSettingsToggle />
        </div>
        <FilterSettingsEditor className="mb-2" />
        <div className="mb-2">{stickyPostsList}</div>
        <div className="mb-10">
          <Suspense
            fallback={<PostsListSkeleton count={12} viewType="fromContext" />}
          >
            {frontpagePostsList}
          </Suspense>
        </div>
      </FilterSettingsProvider>
      {process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID && (
        <HomePageCommunitySection className="mb-10">
          {communityPostsList}
        </HomePageCommunitySection>
      )}
      <HomePageQuickTakesSection coreTags={coreTags} className="mb-10">
        <Suspense fallback={<QuickTakesListSkeleton count={5} />}>
          {quickTakesList}
        </Suspense>
      </HomePageQuickTakesSection>
      <HomePagePopularCommentsSection className="mb-10">
        <Suspense fallback={<QuickTakesListSkeleton count={3} />}>
          {popularCommentsList}
        </Suspense>
      </HomePagePopularCommentsSection>
      <Type className="mb-2" style="sectionTitleLarge">
        Recent discussion
      </Type>
      <Suspense fallback={<div className="bg-gray-200 w-full h-[400px] rounded" />}>
        {recentDiscussions}
      </Suspense>
    </div>
  );
}
