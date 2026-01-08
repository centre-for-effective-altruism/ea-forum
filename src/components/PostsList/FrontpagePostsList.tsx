import { fetchFrontpagePostsList } from "@/lib/posts/postLists";
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
  const posts = await fetchFrontpagePostsList({
    limit: initialLimit,
    onlyTagId,
    excludeTagId,
  });
  return <PostsList posts={posts} className={className} />;
}
