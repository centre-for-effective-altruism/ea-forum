import HomePageLayout from "@/components/HomePageLayout";
import PostsList from "@/components/PostsList";
import { getDbOrThrow } from "@/lib/db";
import { PostsRepo } from "@/lib/posts/postQueries.repo";
import { CommentsRepo } from "@/lib/comments/commentQueries.repo";
import QuickTakesList from "@/components/QuickTakesList";

export default async function HomePage() {
  const db = getDbOrThrow();
  const postsRepo = new PostsRepo(db);
  const commentsRepo = new CommentsRepo(db);
  const [mainPosts, communityPosts, quickTakes] = await Promise.all([
    postsRepo.frontpagePostsList({ limit: 11 }),
    postsRepo.frontpagePostsList({ limit: 5 }), // TODO Filter community
    commentsRepo.frontpageQuickTakes({ limit: 5 }),
  ]);
  return (
    <HomePageLayout
      mainPostsList={<PostsList posts={mainPosts} />}
      communityPostsList={<PostsList posts={communityPosts} />}
      quickTakesList={<QuickTakesList quickTakes={quickTakes} />}
      popularCommentsList={<>TODO</>}
      recentDiscussionList={<>TODO</>}
    />
  );
}
