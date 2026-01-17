import { Suspense } from "react";
import { cookies } from "next/headers";
import { fetchCoreTags } from "@/lib/tags/tagQueries";
import { isPostsListViewType } from "@/lib/posts/postsListView";
import { PostsListViewProvider } from "@/lib/hooks/usePostsListView";
import type { NextSearchParams } from "@/lib/typeHelpers";
import Type from "../Type";
import PostsListViewPicker from "../PostsList/PostsListViewPicker";
import ViewBasedPostsList from "../PostsList/ViewBasedPostsList";
import FrontpageQuickTakesList from "../QuickTakes/FrontpageQuickTakesList";
import PopularCommentsList from "./PopularCommentsList";
import RecentDiscussionsFeed from "./RecentDiscussions/RecentDiscussionsFeed";
import QuickTakesListSkeleton from "../QuickTakes/QuickTakesListSkeleton";
import NewQuickTake from "../QuickTakes/NewQuickTake";
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
  const communityTagId = process.env.COMMUNITY_TAG_ID;
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
          <div className="mb-2 flex items-center justify-between">
            <Type style="sectionTitleLarge">New &amp; upvoted</Type>
            <div className="flex items-center gap-1">
              <Type
                style="loadMore"
                As="button"
                className="cursor-pointer text-gray-600 hover:text-gray-1000"
              >
                Customize feed
              </Type>
              <PostsListViewPicker />
            </div>
          </div>
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
            <ViewBasedPostsList
              viewType="fromContext"
              maxOffset={200}
              view={{
                view: "frontpage",
                limit: 11,
                excludeTagId: communityTagId,
              }}
              bottomRightNode={
                <Type style="loadMore">
                  <Link href="/allPosts" className="text-primary hover:opacity-70">
                    Advanced sorting & filtering
                  </Link>
                </Type>
              }
            />
          </div>
          {communityTagId && (
            <>
              <div className="flex justify-between item-center">
                <Type className="mb-2" style="sectionTitleLarge">
                  Posts tagged community
                </Type>
                <Type style="loadMore">
                  <Link
                    href="/topics/community"
                    className="text-gray-600 hover:text-gray-1000"
                  >
                    View more
                  </Link>
                </Type>
              </div>
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
          <div className="flex justify-between item-center">
            <Type className="mb-2" style="sectionTitleLarge">
              Quick takes
            </Type>
            <Type style="loadMore">
              <Link
                href="/quicktakes"
                className="text-gray-600 hover:text-gray-1000"
              >
                View more
              </Link>
            </Type>
          </div>
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
