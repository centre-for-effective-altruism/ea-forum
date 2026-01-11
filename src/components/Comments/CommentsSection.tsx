import { getCurrentUser } from "@/lib/users/currentUser";
import { fetchCommmentsForPost } from "@/lib/comments/commentLists";
import { commentsToCommentTree } from "@/lib/CommentTree";
import CommentItem from "./CommentItem";
import Type from "../Type";

export default async function CommentsSection({
  postId,
  className = "",
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
        Comments <span className="text-gray-600">{comments.length}</span>
      </Type>
      <section
        className={`flex flex-col gap-4 ${className}`}
        data-component="CommentsSection"
      >
        {tree.map((node) => (
          <CommentItem node={node} key={node.comment._id} />
        ))}
      </section>
    </>
  );
}
