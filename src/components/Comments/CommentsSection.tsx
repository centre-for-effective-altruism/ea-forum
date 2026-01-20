import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchCommmentsForPost } from "@/lib/comments/commentLists";
import { CommentsListProvider } from "./useCommentsList";
import CommentsList from "./CommentsList";
import NewComment from "./NewComment";
import Type from "../Type";

export default async function CommentsSection({
  postId,
  className,
}: Readonly<{ postId: string; className?: string }>) {
  const currentUser = await getCurrentUser();
  const comments = await fetchCommmentsForPost({
    postId,
    currentUserId: currentUser?._id ?? null,
  });
  return (
    <CommentsListProvider comments={comments}>
      <Type style="commentsHeader" className="mt-18 mb-6" id="comments">
        Comments{" "}
        {comments.length > 0 && (
          <span className="text-gray-600">{comments.length}</span>
        )}
      </Type>
      <NewComment postId={postId} className="mb-6" />
      <CommentsList className={className} />
    </CommentsListProvider>
  );
}
