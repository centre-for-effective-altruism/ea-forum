import { PostsRepo } from "@/lib/posts/PostsRepo";
import HomePageLayout from "@/components/HomePageLayout";
import PostsList from "@/components/PostsList";

export default async function HomePage() {
  const postsRepo = new PostsRepo();
  const [mainPosts, communityPosts] = await Promise.all([
    postsRepo.getFrontpagePostsList({ limit: 11 }),
    postsRepo.getFrontpagePostsList({ limit: 5 }),
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
