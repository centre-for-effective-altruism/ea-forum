import { getDatabaseOrThrow } from "@/lib/database";
import { PostsRepo } from "@/lib/posts/posts.queries";
import HomePageLayout from "@/components/HomePageLayout";
import PostsList from "@/components/PostsList";

export default async function HomePage() {
  const db = getDatabaseOrThrow();
  const posts = await new PostsRepo(db).frontpagePostsList({ limit: 10 });
  return (
    <HomePageLayout
      mainPostsList={<PostsList posts={posts} />}
      communityPostsList={null}
      quickTakesList={null}
      popularCommentsList={null}
      recentDiscussionList={null}
    />
  );
}
