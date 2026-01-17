import { ReactNode, Suspense } from "react";
import type { PostsListViewType } from "@/lib/posts/postsListView";
import type { PostsListView } from "@/lib/posts/postsHelpers";
import { fetchPostsListFromView } from "@/lib/posts/postLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import PostsListSkeleton from "./PostsListSkeleton";
import PostsList from "./PostsList";

export default async function ViewBasedPostsList({
  initialLimit,
  maxOffset,
  view,
  viewType,
  hideLoadMore,
  bottomRightNode,
}: Readonly<{
  initialLimit?: number;
  maxOffset?: number;
  view: PostsListView;
  viewType?: PostsListViewType | "fromContext";
  hideLoadMore?: boolean;
  bottomRightNode?: ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  const posts = await fetchPostsListFromView(currentUser?._id ?? null, {
    ...view,
    limit: initialLimit ?? view.limit,
  });
  return (
    <Suspense
      fallback={
        <PostsListSkeleton count={initialLimit ?? view.limit} viewType={viewType} />
      }
    >
      <PostsList
        posts={posts}
        viewType={viewType}
        loadMoreView={hideLoadMore ? undefined : view}
        maxOffset={maxOffset}
        bottomRightNode={bottomRightNode}
      />
    </Suspense>
  );
}
