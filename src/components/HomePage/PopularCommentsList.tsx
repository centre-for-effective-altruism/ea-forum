import { fetchPopularComments } from "@/lib/comments/commentLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import QuickTakesList from "../QuickTakes/QuickTakesList";

export default async function PopularCommentsList({
  initialLimit,
  className,
}: Readonly<{
  initialLimit: number;
  className?: string;
}>) {
  const currentUser = await getCurrentUser();
  const popularComments = await fetchPopularComments({
    currentUserId: currentUser?._id ?? null,
    limit: initialLimit,
  });
  // TODO: This probably shouldn't be using quick takes list...
  return <QuickTakesList quickTakes={popularComments} className={className} />;
}
