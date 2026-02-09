import { fetchPopularComments } from "@/lib/comments/commentLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import CommentItem from "../Comments/CommentItem";

export default async function PopularCommentsList({
  initialLimit,
  className,
}: Readonly<{
  initialLimit: number;
  className?: string;
}>) {
  const currentUser = await getCurrentUser();
  const popularComments = await fetchPopularComments({
    currentUser,
    limit: initialLimit,
  });
  return (
    <section data-component="PopularCommentsList" className={className}>
      {popularComments.map((comment) => (
        <CommentItem
          key={comment._id}
          node={{ comment, depth: 0, children: [], isLocal: false }}
          showPreviewWhenCollapsed
          startCollapsed
        />
      ))}
    </section>
  );
}
