import { Suspense } from "react";
import { cookies } from "next/headers";
import { fetchCoreTags } from "@/lib/tags/tagQueries";
import { isPostsListViewType } from "@/lib/posts/postsListView";
import { PostsListViewProvider } from "@/lib/hooks/usePostsListView";
import { FilterSettingsProvider } from "@/lib/hooks/useFilterSettings";
import type { NextSearchParams } from "@/lib/typeHelpers";
import PostsListViewPicker from "../PostsList/PostsListViewPicker";
import ViewBasedPostsList from "../PostsList/ViewBasedPostsList";
import FrontpagePostsList from "../PostsList/FrontpagePostsList";
import FrontpageQuickTakesList from "../QuickTakes/FrontpageQuickTakesList";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import PopularCommentsList from "./PopularCommentsList";
import FilterSettingsToggle from "./FilterSettingsToggle";
import FilterSettingsEditor from "./FilterSettingsEditor";
import RecentDiscussionsSection from "./RecentDiscussions/RecentDiscussionsSection";
import HomePagePopularCommentsSection from "./HomePagePopularCommentsSection";
import QuickTakesListSkeleton from "../QuickTakes/QuickTakesListSkeleton";
import HomePageQuickTakesSection from "./HomePageQuickTakesSection";
import HomePageCommunitySection from "./HomePageCommunitySection";
import Type from "../Type";
import Link from "../Link";

export default async function HomePageFeed({
  search,
}: {
  search: NextSearchParams;
}) {
  const [cookieStore, coreTags] = await Promise.all([cookies(), fetchCoreTags()]);
  const postViewCookie = cookieStore.get("posts_list_view_type")?.value ?? "";
  const ssrPostView = isPostsListViewType(postViewCookie)
    ? postViewCookie
    : undefined;
  const communityTagId = process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID;
  const activeTag =
    search.tab && typeof search.tab === "string"
      ? coreTags.find((tag) => tag.slug === search.tab)
      : null;
  return (
    <PostsListViewProvider ssrValue={ssrPostView}>
      {activeTag ? (
        <>
          <div className="mb-2 flex items-center justify-between">
            <Type style="sectionTitleLarge">New &amp; upvoted</Type>
            <div className="flex items-center gap-1">
              <Type style="loadMore">
                <Link
                  href={`/topics/${search.tab}`}
                  className="text-gray-600 hover:text-gray-1000"
                >
                  View more
                </Link>
              </Type>
              <PostsListViewPicker />
            </div>
          </div>
          <div className="mb-10">
            <ViewBasedPostsList
              viewType="fromContext"
              initialLimit={30}
              maxOffset={200}
              view={{
                view: "frontpage",
                limit: 11,
                onlyTagId: activeTag._id,
              }}
            />
          </div>
        </>
      ) : (
        <>
          <FilterSettingsProvider>
            <div className="mb-2 flex items-center justify-between">
              <Type style="sectionTitleLarge">New &amp; upvoted</Type>
              <div className="flex items-center gap-1">
                <FilterSettingsToggle />
                <PostsListViewPicker />
              </div>
            </div>
            <FilterSettingsEditor className="mb-2" />
            <div className="mb-2">
              <ViewBasedPostsList
                viewType="list"
                hideLoadMore
                view={{
                  view: "sticky",
                  limit: 5,
                }}
              />
            </div>
            <div className="mb-10">
              <Suspense
                fallback={<PostsListSkeleton count={12} viewType="fromContext" />}
              >
                <FrontpagePostsList />
              </Suspense>
            </div>
          </FilterSettingsProvider>
          {communityTagId && (
            <HomePageCommunitySection className="mb-10">
              <ViewBasedPostsList
                viewType="fromContext"
                hideLoadMore
                view={{
                  view: "frontpage",
                  limit: 5,
                  onlyTagId: communityTagId,
                }}
              />
            </HomePageCommunitySection>
          )}
          <HomePageQuickTakesSection coreTags={coreTags} className="mb-10">
            <Suspense fallback={<QuickTakesListSkeleton count={5} />}>
              <FrontpageQuickTakesList initialLimit={5} />
            </Suspense>
          </HomePageQuickTakesSection>
          <HomePagePopularCommentsSection className="mb-10">
            <Suspense fallback={<QuickTakesListSkeleton count={3} />}>
              <PopularCommentsList initialLimit={3} />
            </Suspense>
          </HomePagePopularCommentsSection>
          <Type className="mb-2" style="sectionTitleLarge">
            Recent discussion
          </Type>
          <Suspense
            fallback={<div className="bg-gray-200 w-full h-[400px] rounded" />}
          >
            <RecentDiscussionsSection />
          </Suspense>
        </>
      )}
    </PostsListViewProvider>
  );
}
