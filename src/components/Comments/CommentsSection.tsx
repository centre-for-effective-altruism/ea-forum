import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchCommmentsForPost } from "@/lib/comments/commentLists";
import { commentsToCommentTree } from "@/lib/comments/CommentTree";
import clsx from "clsx";
import CommentItem from "./CommentItem";
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
  const tree = commentsToCommentTree(comments);
  return (
    <>
      <Type style="commentsHeader" className="mt-18 mb-6" id="comments">
        Comments{" "}
        {comments.length > 0 && (
          <span className="text-gray-600">{comments.length}</span>
        )}
      </Type>
      <NewComment postId={postId} className="mb-6" />
      <section
        className={clsx("flex flex-col gap-4", className)}
        data-component="CommentsSection"
      >
        {tree.length === 0 && (
          <div className="text-gray-600 text-center">
            <Type>No comments on this post yet.</Type>
            <Type>Be the first to respond.</Type>
          </div>
        )}
        {tree.map((node) => (
          <CommentItem node={node} key={node.comment._id} />
        ))}
      </section>
    </>
  );
}
