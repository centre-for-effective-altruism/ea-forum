import { fetchRecentlyActiveQuickTakes } from "@/lib/comments/commentLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import ClientRecentlyActiveQuickTakesList from "./ClientRecentlyActiveQuickTakesList";

export default async function RecentlyActiveQuickTakesList({
  initialLimit,
  className,
}: Readonly<{
  initialLimit: number;
  className?: string;
}>) {
  const currentUser = await getCurrentUser();
  const quickTakes = await fetchRecentlyActiveQuickTakes({
    currentUser,
    limit: initialLimit,
  });
  return (
    <ClientRecentlyActiveQuickTakesList
      quickTakes={quickTakes}
      className={className}
    />
  );
}
