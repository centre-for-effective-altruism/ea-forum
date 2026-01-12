import { PostsListViewType } from "@/lib/hooks/usePostsListView";
import { fetchFrontpagePostsList } from "@/lib/posts/postLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import PostsList from "./PostsList";

export default async function FrontpagePostsList({
  viewType,
  initialLimit,
  onlyTagId,
  excludeTagId,
  className,
}: Readonly<{
  viewType?: PostsListViewType | "fromContext";
  initialLimit: number;
  onlyTagId?: string;
  excludeTagId?: string;
  className?: string;
}>) {
  const currentUser = await getCurrentUser();
  const posts = await fetchFrontpagePostsList({
    currentUserId: currentUser?._id ?? null,
    limit: initialLimit,
    onlyTagId,
    excludeTagId,
  });
  return <PostsList posts={posts} viewType={viewType} className={className} />;
}
