import { fetchCommmentsForPost } from "@/lib/comments/commentLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import CommentsSection from "./CommentsSection";

export default async function LazyCommentsSection({
  postId,
  className = "",
}: Readonly<{ postId: string; className?: string }>) {
  const currentUser = await getCurrentUser();
  const comments = await fetchCommmentsForPost({
    postId,
    currentUserId: currentUser?._id ?? null,
  });
  return <CommentsSection comments={comments} className={className} />;
}
