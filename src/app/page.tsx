import HomePageLayout from "@/components/HomePageLayout";
import PostsList from "@/components/PostsList";
import { PostsRepo } from "@/lib/posts/postQueries.queries";
import { getDbOrThrow } from "@/lib/db";

export default async function HomePage() {
  const postsRepo = new PostsRepo(getDbOrThrow());
  const [mainPosts, communityPosts] = await Promise.all([
    postsRepo.frontpagePostsList({ limit: 11 }),
    postsRepo.frontpagePostsList({ limit: 5 }), // TODO Filter community
  ]);
  return (
    <HomePageLayout
      mainPostsList={<PostsList posts={mainPosts} />}
      communityPostsList={<PostsList posts={communityPosts} />}
      quickTakesList={null}
      popularCommentsList={null}
      recentDiscussionList={null}
    />
  );
}
