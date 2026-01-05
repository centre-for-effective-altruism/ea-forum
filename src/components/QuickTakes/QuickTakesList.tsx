import type { CommentsList } from "@/lib/comments/commentLists";
import QuickTakeItem from "./QuickTakeItem";

export default function QuickTakesList({
  quickTakes,
}: Readonly<{
  quickTakes: CommentsList[];
}>) {
  return (
    <div data-component="QuickTakesList">
      {quickTakes.map((quickTake) => (
        <QuickTakeItem key={quickTake._id} quickTake={quickTake} />
      ))}
    </div>
  );
}
