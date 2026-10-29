export default function TopicSidebarSkeleton() {
  return (
    <div data-component="TopicSidebarSkeleton" className="flex flex-col gap-3">
      {[80, 65, 90, 70, 55].map((width, i) => (
        <div
          key={i}
          className="h-3 bg-gray-200 rounded"
          style={{ width: `${width}%` }}
        />
      ))}
    </div>
  );
}
