import range from "lodash/range";

export default function SequencesGridSkeleton({
  count,
}: Readonly<{ count: number }>) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
      {range(count).map((i) => (
        <div key={i} className="rounded bg-gray-300 h-[250px]" />
      ))}
    </div>
  );
}
