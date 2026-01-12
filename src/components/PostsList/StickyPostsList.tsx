import { fetchStickyPostsList } from "@/lib/posts/postLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import PostsList from "./PostsList";

export default async function FrontpagePostsList({
  initialLimit,
  className,
}: Readonly<{
  initialLimit: number;
  className?: string;
}>) {
  const currentUser = await getCurrentUser();
  const posts = await fetchStickyPostsList({
    currentUserId: currentUser?._id ?? null,
    limit: initialLimit,
  });
  return <PostsList posts={posts} className={className} />;
}
