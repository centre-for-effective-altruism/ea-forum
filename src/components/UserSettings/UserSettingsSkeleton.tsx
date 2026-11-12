import range from "lodash/range";

export default function UserSettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      {range(6).map((i) => (
        <div key={i} className="h-12 rounded bg-gray-200 animate-pulse" />
      ))}
    </div>
  );
}
