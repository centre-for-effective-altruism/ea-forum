import type { CommentsList } from "@/lib/comments/commentLists";
import QuickTakeItem from "./QuickTakeItem";

export default function QuickTakesList({
  quickTakes,
  className,
}: Readonly<{
  quickTakes: CommentsList[];
  className?: string;
}>) {
  return (
    <div data-component="QuickTakesList" className={className}>
      {quickTakes.map((quickTake) => (
        <QuickTakeItem key={quickTake._id} quickTake={quickTake} />
      ))}
    </div>
  );
}
