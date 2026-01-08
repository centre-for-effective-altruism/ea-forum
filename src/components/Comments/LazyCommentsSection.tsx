import { fetchCommmentsForPost } from "@/lib/comments/commentLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import CommentsSection from "./CommentsSection";
import Type from "../Type";

export default async function LazyCommentsSection({
  postId,
  className = "",
}: Readonly<{ postId: string; className?: string }>) {
  const currentUser = await getCurrentUser();
  const comments = await fetchCommmentsForPost({
    postId,
    currentUserId: currentUser?._id ?? null,
  });
  return (
    <>
      <Type style="commentsHeader" className="mt-18 mb-6">
        Comments <span className="text-gray-600">{comments.length}</span>
      </Type>
      <CommentsSection comments={comments} className={className} />;
    </>
  );
}
