export default function NotificationDisplaySkeleton() {
  return (
    <div
      data-component="NotificationDisplaySkeleton"
      className="flex gap-2 mt-2 mb-4 pl-2 pr-1"
    >
      <div className="w-6 h-6 min-w-6 bg-gray-200 rounded-full" />
      <div className="grow">
        <div className="w-20 h-4 bg-gray-100 rounded mb-2" />
        <div className="w-60 h-4 bg-gray-300 rounded" />
      </div>
      <div className="w-8 h-3 bg-gray-100 rounded" />
    </div>
  );
}
