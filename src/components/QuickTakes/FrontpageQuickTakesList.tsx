import { getDbOrThrow } from "@/lib/db";
import { CommentsRepo } from "@/lib/comments/commentQueries.repo";
import QuickTakesList from "./QuickTakesList";

export default async function FrontpageQuickTakesList({
  initialLimit,
}: Readonly<{
  initialLimit: number;
}>) {
  const quickTakes = await new CommentsRepo(getDbOrThrow()).frontpageQuickTakes({
    limit: initialLimit,
  });
  return <QuickTakesList quickTakes={quickTakes} />;
}
