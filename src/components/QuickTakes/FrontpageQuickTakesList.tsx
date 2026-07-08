import {
  countFrontpageQuickTakes,
  fetchFrontpageQuickTakes,
} from "@/lib/comments/commentLists";
import { getCurrentUser } from "@/lib/users/currentUser";
import QuickTakesList from "./QuickTakesList";

export default async function FrontpageQuickTakesList({
  initialLimit,
  className,
}: Readonly<{
  initialLimit: number;
  className?: string;
}>) {
  const currentUser = await getCurrentUser();
  const [quickTakes, totalCount] = await Promise.all([
    fetchFrontpageQuickTakes({ currentUser, limit: initialLimit }),
    countFrontpageQuickTakes({ currentUser }),
  ]);
  return (
    <QuickTakesList
      quickTakes={quickTakes}
      totalCount={totalCount}
      className={className}
    />
  );
}
