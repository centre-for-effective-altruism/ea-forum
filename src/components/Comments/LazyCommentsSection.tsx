import { CommentsRepo } from "@/lib/comments/commentQueries.repo";
import { getDbOrThrow } from "@/lib/db";
import CommentsSection from "./CommentsSection";

export default async function LazyCommentsSection({
  postId,
  className = "",
}: Readonly<{ postId: string; className?: string }>) {
  const comments = await new CommentsRepo(getDbOrThrow()).postComments({ postId });
  return <CommentsSection comments={comments} className={className} />;
}
