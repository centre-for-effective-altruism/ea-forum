import QuickTakeItemSkeleton from "./QuickTakeItemSkeleton";

export default function QuickTakesListSkeleton({
  count,
}: Readonly<{ count: number }>) {
  return (
    <>
      {new Array(count).fill(null).map((_, i) => (
        <QuickTakeItemSkeleton key={i} />
      ))}
    </>
  );
}
