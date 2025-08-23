import QuickTakeItemSkeleton from "./QuickTakeItemSkeleton";

export default function QuickTakesListSkeleton({
  count,
}: Readonly<{ count: number }>) {
  return (
    <section className="max-w-full" data-component="QuickTakesListSkeleton">
      {new Array(count).fill(null).map((_, i) => (
        <QuickTakeItemSkeleton key={i} />
      ))}
    </section>
  );
}
