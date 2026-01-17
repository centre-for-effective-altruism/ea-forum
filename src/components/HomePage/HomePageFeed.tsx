import { Suspense } from "react";
import { cookies } from "next/headers";
import { fetchCoreTags } from "@/lib/tags/tagQueries";
import { isPostsListViewType } from "@/lib/posts/postsListView";
import { PostsListViewProvider } from "@/lib/hooks/usePostsListView";
import type { NextSearchParams } from "@/lib/typeHelpers";
import Type from "../Type";
import PostsListViewPicker from "../PostsList/PostsListViewPicker";
import ViewBasedPostsList from "../PostsList/ViewBasedPostsList";
import StickyPostsList from "../PostsList/StickyPostsList";
import FrontpagePostsList from "../PostsList/FrontpagePostsList";
import FrontpageQuickTakesList from "../QuickTakes/FrontpageQuickTakesList";
import PopularCommentsList from "./PopularCommentsList";
import RecentDiscussionsFeed from "./RecentDiscussions/RecentDiscussionsFeed";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import QuickTakesListSkeleton from "../QuickTakes/QuickTakesListSkeleton";
import NewQuickTake from "../QuickTakes/NewQuickTake";

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
  const communityTagId = process.env.COMMUNITY_TAG_ID;
  const activeTag =
    search.tab && typeof search.tab === "string"
      ? coreTags.find((tag) => tag.slug === search.tab)
      : null;
  return (
    <PostsListViewProvider ssrValue={ssrPostView}>
      {activeTag ? (
        <>
          <div className="mb-2 flex items-center">
            <Type style="sectionTitleLarge" className="grow">
              New &amp; upvoted
            </Type>
            <PostsListViewPicker />
          </div>
          <div className="mb-10">
            <Suspense
              fallback={<PostsListSkeleton count={30} viewType="fromContext" />}
            >
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
          <div className="mb-2 flex items-center">
            <Type style="sectionTitleLarge" className="grow">
              New &amp; upvoted
            </Type>
            <PostsListViewPicker />
          </div>
          <div className="mb-2">
            <Suspense fallback={<PostsListSkeleton count={2} />}>
              <StickyPostsList initialLimit={30} />
            </Suspense>
          </div>
          <div className="mb-10">
            <ViewBasedPostsList
              viewType="fromContext"
              maxOffset={200}
              view={{
                view: "frontpage",
                limit: 11,
                excludeTagId: communityTagId,
              }}
            />
          </div>
          {communityTagId && (
            <>
              <Type className="mb-2" style="sectionTitleLarge">
                Posts tagged community
              </Type>
              <div className="mb-10">
                <ViewBasedPostsList
                  viewType="fromContext"
                  hideLoadMore
                  view={{
                    view: "frontpage",
                    limit: 5,
                    onlyTagId: communityTagId,
                  }}
                />
              </div>
            </>
          )}
          <Type className="mb-2" style="sectionTitleLarge">
            Quick takes
          </Type>
          <NewQuickTake className="mb-1" />
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
