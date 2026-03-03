import { fetchPopularComments } from "@/lib/comments/commentLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import ClientPopularCommentsList from "./ClientPopularCommentsList";

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
    <ClientPopularCommentsList
      initialComments={popularComments}
      className={className}
    />
  );
}
