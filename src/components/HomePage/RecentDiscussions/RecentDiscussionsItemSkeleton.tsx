export default function RecentDiscussionsItemSkeleton() {
  return (
    <div
      data-component="RecentDiscussionsItemSkeleton"
      className="flex flex-col gap-4 my-7"
    >
      <div className="flex items-center gap-2">
        <div className="w-[24px] h-[24px] bg-gray-300 rounded-full" />
        <div className="w-[500px] max-w-full h-[14px] bg-gray-300 rounded" />
      </div>
      <div className="pl-[32px]">
        <div className="w-full h-[300px] bg-gray-200 rounded" />
      </div>
    </div>
  );
}
