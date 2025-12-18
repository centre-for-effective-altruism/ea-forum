import { fetchFrontpagePostsList } from "@/lib/posts/postLists";
import PostsList from "./PostsList";

export default async function FrontpagePostsList({
  initialLimit,
  community = false,
}: Readonly<{
  initialLimit: number;
  community?: boolean;
}>) {
  const posts = await fetchFrontpagePostsList({
    limit: initialLimit,
    community,
  });
  return <PostsList posts={posts} />;
}
