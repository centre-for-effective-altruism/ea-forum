import { fetchCommmentsForPost } from "@/lib/comments/commentLists";
import CommentsSection from "./CommentsSection";

export default async function LazyCommentsSection({
  postId,
  className = "",
}: Readonly<{ postId: string; className?: string }>) {
  const comments = await fetchCommmentsForPost(postId);
  return <CommentsSection comments={comments} className={className} />;
}
