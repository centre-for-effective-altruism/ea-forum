import { Suspense } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { fetchPostsListFromView } from "@/lib/posts/postLists";
import { getDefaultFilterSettings } from "@/lib/filterSettings";
import { getCurrentUser } from "@/lib/users/currentUser";
import PostsListSkeleton from "./PostsListSkeleton";
import ClientFrontpagePostsList from "./ClientFrontpagePostsList";
import Type from "../Type";
import Link from "../Link";

export default async function FrontpagePostsList() {
  const currentUser = await getCurrentUser();
  const view = {
    view: "frontpage",
    limit: 11,
    excludeTagId: process.env.NEXT_PUBLIC_COMMUNITY_TAG_ID,
    filterSettings:
      currentUser?.frontpageFilterSettings ?? getDefaultFilterSettings(),
  } as const;
  const posts = await fetchPostsListFromView(currentUser?._id ?? null, view);
  return (
    <Suspense
      fallback={<PostsListSkeleton count={view.limit} viewType="fromContext" />}
    >
      <AnalyticsContext listContext="latestPosts">
        <ClientFrontpagePostsList
          posts={posts}
          view={view}
          bottomRightNode={
            <Type style="loadMore">
              <Link href="/allPosts" className="text-primary hover:opacity-70">
                Advanced sorting & filtering
              </Link>
            </Type>
          }
        />
      </AnalyticsContext>
    </Suspense>
  );
}
