export default function TopicDescriptionSkeleton() {
  return (
    <div data-component="TopicDescriptionSkeleton" className="flex flex-col gap-3">
      {[100, 95, 98, 60].map((width, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded"
          style={{ width: `${width}%` }}
        />
      ))}
    </div>
  );
}
