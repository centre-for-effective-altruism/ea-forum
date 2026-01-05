import { fetchFrontpageQuickTakes } from "@/lib/comments/commentLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import QuickTakesList from "./QuickTakesList";

export default async function FrontpageQuickTakesList({
  initialLimit,
}: Readonly<{
  initialLimit: number;
}>) {
  const currentUser = await getCurrentUser();
  const quickTakes = await fetchFrontpageQuickTakes({
    currentUserId: currentUser?._id ?? null,
    limit: initialLimit,
  });
  return <QuickTakesList quickTakes={quickTakes} />;
}
