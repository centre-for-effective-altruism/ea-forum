import { Suspense } from "react";
import { fetchCoreTags } from "@/lib/tags/tagQueries";
import { PostsListViewProvider } from "@/lib/hooks/usePostsListView";
import type { NextSearchParams } from "@/lib/typeHelpers";
import Type from "../Type";
import StickyPostsList from "../PostsList/StickyPostsList";
import FrontpagePostsList from "../PostsList/FrontpagePostsList";
import FrontpageQuickTakesList from "../QuickTakes/FrontpageQuickTakesList";
import PopularCommentsList from "./PopularCommentsList";
import RecentDiscussionsFeed from "./RecentDiscussions/RecentDiscussionsFeed";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import QuickTakesListSkeleton from "../QuickTakes/QuickTakesListSkeleton";

export default async function HomePageFeed({
  search,
}: {
  search: NextSearchParams;
}) {
  const communityTagId = process.env.COMMUNITY_TAG_ID;
  const coreTags = await fetchCoreTags();
  const activeTag =
    search.tab && typeof search.tab === "string"
      ? coreTags.find((tag) => tag.slug === search.tab)
      : null;
  return (
    <PostsListViewProvider>
      {activeTag ? (
        <>
          <Type className="mb-2" style="sectionTitleLarge">
            New &amp; upvoted
          </Type>
          <div className="mb-10">
            <Suspense fallback={<PostsListSkeleton count={30} />}>
              <FrontpagePostsList
                initialLimit={30}
                onlyTagId={activeTag._id}
                viewType="fromContext"
              />
            </Suspense>
          </div>
        </>
      ) : (
        <>
          <Type className="mb-2" style="sectionTitleLarge">
            New &amp; upvoted
          </Type>
          <div className="mb-2">
            <Suspense fallback={<PostsListSkeleton count={2} />}>
              <StickyPostsList initialLimit={30} />
            </Suspense>
          </div>
          <div className="mb-10">
            <Suspense fallback={<PostsListSkeleton count={11} />}>
              <FrontpagePostsList
                initialLimit={11}
                excludeTagId={communityTagId}
                viewType="fromContext"
              />
            </Suspense>
          </div>
          {communityTagId && (
            <>
              <Type className="mb-2" style="sectionTitleLarge">
                Posts tagged community
              </Type>
              <div className="mb-10">
                <Suspense fallback={<PostsListSkeleton count={5} />}>
                  <FrontpagePostsList initialLimit={5} onlyTagId={communityTagId} />
                </Suspense>
              </div>
            </>
          )}
          <Type className="mb-2" style="sectionTitleLarge">
            Quick takes
          </Type>
          <div className="mb-10">
            <Suspense fallback={<QuickTakesListSkeleton count={5} />}>
              <FrontpageQuickTakesList initialLimit={5} />
            </Suspense>
          </div>
          <Type className="mb-2" style="sectionTitleLarge">
            Popular comments
          </Type>
          <div className="mb-10">
            <Suspense fallback={<QuickTakesListSkeleton count={3} />}>
              <PopularCommentsList initialLimit={3} />
            </Suspense>
          </div>
          <Type className="mb-2" style="sectionTitleLarge">
            Recent discussion
          </Type>
          <Suspense
            fallback={<div className="bg-gray-200 w-full h-[400px] rounded" />}
          >
            <RecentDiscussionsFeed />
          </Suspense>
        </>
      )}
    </PostsListViewProvider>
  );
}
