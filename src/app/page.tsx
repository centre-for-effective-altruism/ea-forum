import { getDatabaseOrThrow } from "@/lib/database";
import { PostsRepo } from "@/lib/posts/posts.queries";
import HomePageLayout from "@/components/HomePageLayout";
import PostsList from "@/components/PostsList";

export default async function HomePage() {
  const db = getDatabaseOrThrow();
  const postsRepo = new PostsRepo(db);
  const [mainPosts, communityPosts] = await Promise.all([
    postsRepo.frontpagePostsList({ limit: 11 }),
    postsRepo.frontpagePostsList({ limit: 5 }),
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
