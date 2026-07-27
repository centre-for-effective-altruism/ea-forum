"use client";

import { ReactNode, Suspense } from "react";
import type { SpotlightBase } from "@/lib/spotlights/spotlightQueries";
import type { TagBase } from "@/lib/tags/tagQueries";
import { FilterSettingsProvider } from "@/lib/hooks/useFilterSettings";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useHomePage } from "./HomePageContext";
import HomePagePopularCommentsSection from "./HomePagePopularCommentsSection";
import QuickTakesListSkeleton from "../QuickTakes/QuickTakesListSkeleton";
import HomePageQuickTakesSection from "./HomePageQuickTakesSection";
import HomePageCommunitySection from "./HomePageCommunitySection";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import FilterSettingsToggle from "./FilterSettingsToggle";
import FilterSettingsEditor from "./FilterSettingsEditor";
import HomePageTagBar from "./HomePageTagBar";
import Spotlight from "../Spotlights/Spotlight";
import PostsList from "../PostsList/PostsList";
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
  const { currentTab, currentTag } = useHomePage();
  if (currentTab !== "magic") {
    return null;
  }

  if (currentTag) {
    return (
      <div data-component="HomePageMagicTab">
        <HomePageTagBar coreTags={coreTags} className="mb-5" />
        <PostsList
          key={currentTag._id}
          posts={[]}
          maxOffset={200}
          loadMoreView={{
            view: "frontpage",
            limit: 30,
            onlyTagId: currentTag._id,
          }}
        />
      </div>
    );
  }

  return (
    <AnalyticsContext homePageTab="magic">
      <div data-component="HomePageMagicTab">
        {spotlight && <Spotlight spotlight={spotlight} className="mt-6 mb-4" />}
        <FilterSettingsProvider>
          <div className="mb-5">
            <div className="flex items-center justify-between gap-4">
              <HomePageTagBar coreTags={coreTags} className="min-w-0" />
              <FilterSettingsToggle />
            </div>
            <FilterSettingsEditor className="mt-2" />
          </div>
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
        <div className="flex flex-col-reverse mobile-nav:grid grid-cols-2 gap-x-4">
          <HomePagePopularCommentsSection className="mb-10">
            <Suspense fallback={<QuickTakesListSkeleton count={3} />}>
              {popularCommentsList}
            </Suspense>
          </HomePagePopularCommentsSection>
          <HomePageQuickTakesSection coreTags={coreTags} className="mb-10">
            <Suspense fallback={<QuickTakesListSkeleton count={5} />}>
              {quickTakesList}
            </Suspense>
          </HomePageQuickTakesSection>
        </div>
        <Type className="mb-2" style="sectionTitleLarge">
          Recent discussion
        </Type>
        <Suspense
          fallback={<div className="bg-gray-200 w-full h-[400px] rounded" />}
        >
          {recentDiscussions}
        </Suspense>
      </div>
    </AnalyticsContext>
  );
}
