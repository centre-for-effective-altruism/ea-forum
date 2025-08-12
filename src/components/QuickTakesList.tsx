import type { IFrontpageQuickTakes } from "@/lib/comments/commentQueries.queries";
import QuickTakeItem from "./QuickTakeItem";

export default function QuickTakesList({
  quickTakes,
}: Readonly<{
  quickTakes: IFrontpageQuickTakes[];
}>) {
  return (
    <div data-component="QuickTakesList">
      {quickTakes.map((quickTake) => (
        <QuickTakeItem key={quickTake._id} quickTake={quickTake} />
      ))}
    </div>
  );
}
