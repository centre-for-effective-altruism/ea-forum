import { getDbOrThrow } from "@/lib/db";
import { PostsRepo } from "@/lib/posts/postQueries.repo";
import PostsList from "./PostsList";

export default async function FrontpagePostsList({
  initialLimit,
  // community,
}: Readonly<{
  initialLimit: number;
  community?: boolean;
}>) {
  // TODO Filter community
  const posts = await new PostsRepo(getDbOrThrow()).frontpagePostsList({
    limit: initialLimit,
  });
  return <PostsList posts={posts} />;
}
