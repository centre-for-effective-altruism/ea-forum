"use client";

import { Suspense } from "react";
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
}: Readonly<{
  coreTags: TagBase[];
  spotlight: SpotlightBase | null;
}>) {
  const { currentTab } = useHomePage();
  if (currentTab !== "magic") {
    return null;
  }

  const communityTagId = process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID;

  return (
    <div data-component="HomePageMagicTab">
      {spotlight && <Spotlight spotlight={spotlight} className="mt-6 mb-4" />}
      <FilterSettingsProvider>
        <div className="mb-2 flex items-center justify-between">
          <Type style="sectionTitleLarge">New &amp; upvoted</Type>
          <FilterSettingsToggle />
        </div>
        <FilterSettingsEditor className="mb-2" />
        <div className="mb-2">
          Sticky post list
          {/*
          <ViewBasedPostsList
            viewType="list"
            hideLoadMore
            view={{
              view: "sticky",
              limit: 5,
            }}
          />
            */}
        </div>
        <div className="mb-10">
          <Suspense
            fallback={<PostsListSkeleton count={12} viewType="fromContext" />}
          >
            {/*<FrontpagePostsList />*/}
            Frontpage post list
          </Suspense>
        </div>
      </FilterSettingsProvider>
      {communityTagId && (
        <HomePageCommunitySection className="mb-10">
          Community post list
          {/*
          <ViewBasedPostsList
            viewType="fromContext"
            hideLoadMore
            view={{
              view: "frontpage",
              limit: 5,
              onlyTagId: communityTagId,
            }}
          />
            */}
        </HomePageCommunitySection>
      )}
      <HomePageQuickTakesSection coreTags={coreTags} className="mb-10">
        <Suspense fallback={<QuickTakesListSkeleton count={5} />}>
          Quick takes
          {/* <FrontpageQuickTakesList initialLimit={5} />*/}
        </Suspense>
      </HomePageQuickTakesSection>
      <HomePagePopularCommentsSection className="mb-10">
        <Suspense fallback={<QuickTakesListSkeleton count={3} />}>
          Popular comments
          {/*<PopularCommentsList initialLimit={3} />*/}
        </Suspense>
      </HomePagePopularCommentsSection>
      <Type className="mb-2" style="sectionTitleLarge">
        Recent discussion
      </Type>
      <Suspense fallback={<div className="bg-gray-200 w-full h-[400px] rounded" />}>
        Recent discussions
        {/*<RecentDiscussionsSection />*/}
      </Suspense>
    </div>
  );
}
