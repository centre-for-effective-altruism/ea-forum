import { fetchFrontpagePostsList } from "@/lib/posts/postLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import PostsList from "./PostsList";

export default async function FrontpagePostsList({
  initialLimit,
  onlyTagId,
  excludeTagId,
  className,
}: Readonly<{
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
  return <PostsList posts={posts} className={className} />;
}
