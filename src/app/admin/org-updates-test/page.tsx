import { Suspense } from "react";
import { cookies } from "next/headers";
import { fetchFrontpageCuratedPostsList } from "@/lib/posts/postLists";
import { fetchTagBySlug } from "@/lib/tags/tagQueries";
import { isPostsListViewType } from "@/lib/posts/postsListView";
import { HideRepeatedPostsProvider } from "@/lib/hooks/useHideRepeatedPosts";
import { PostsListViewProvider } from "@/lib/hooks/usePostsListView";
import { getCurrentUser } from "@/lib/users/currentUser";
import ViewBasedPostsList from "@/components/PostsList/ViewBasedPostsList";
import PostsList from "@/components/PostsList/PostsList";
import PostsListSkeleton from "@/components/PostsList/PostsListSkeleton";
import HomePageCommunitySection from "@/components/HomePage/HomePageCommunitySection";
import Type from "@/components/Type";

// Throwaway admin-only test page for evaluating a home-page layout where posts
// tagged "organization-updates" are diverted into their own section between
// Frontpage and Community. Delete this directory (and the supporting code in
// postLists.ts, postsHelpers.ts, tagQueries.tsx) once the experiment ends.
export default async function AdminOrgUpdatesTestPage() {
  const [cookieStore, curatedPosts, orgUpdatesTag] = await Promise.all([
    cookies(),
    getCurrentUser().then((user) =>
      fetchFrontpageCuratedPostsList(user?._id ?? null),
    ),
    fetchTagBySlug("organization-updates"),
  ]);
  const orgUpdatesTagId = orgUpdatesTag?._id ?? null;

  const postViewCookie = cookieStore.get("posts_list_view_type")?.value ?? "";
  const ssrPostView = isPostsListViewType(postViewCookie)
    ? postViewCookie
    : undefined;

  const communityTagId = process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID;

  const frontpageExcludeTagIds = [communityTagId, orgUpdatesTagId].filter(
    (id): id is string => Boolean(id),
  );

  return (
    <PostsListViewProvider ssrValue={ssrPostView}>
      <Type style="sectionTitleLarge" className="mb-2">
        Admin: organization updates test
      </Type>
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
        <HideRepeatedPostsProvider>
          <PostsList posts={curatedPosts} viewType="fromContext" />
          <Suspense
            fallback={<PostsListSkeleton count={11} viewType="fromContext" />}
          >
            <ViewBasedPostsList
              viewType="fromContext"
              maxOffset={200}
              view={{
                view: "frontpage",
                limit: 11,
                excludeTagId: frontpageExcludeTagIds,
              }}
            />
          </Suspense>
        </HideRepeatedPostsProvider>
      </div>
      {orgUpdatesTagId && (
        <div className="mb-10">
          <Type style="sectionTitleLarge" className="mb-2">
            Organization updates
          </Type>
          <Suspense
            fallback={<PostsListSkeleton count={5} viewType="fromContext" />}
          >
            <ViewBasedPostsList
              viewType="fromContext"
              initialLimit={5}
              view={{
                view: "orgUpdates",
                limit: 10,
              }}
            />
          </Suspense>
        </div>
      )}
      {communityTagId && (
        <HomePageCommunitySection className="mb-10">
          <ViewBasedPostsList
            viewType="fromContext"
            hideLoadMore
            view={{
              view: "frontpage",
              limit: 5,
              onlyTagId: communityTagId,
              excludeTagId: orgUpdatesTagId ?? undefined,
            }}
          />
        </HomePageCommunitySection>
      )}
    </PostsListViewProvider>
  );
}
