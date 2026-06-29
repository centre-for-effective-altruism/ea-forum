import SoftArrowUpIcon from "../Icons/SoftArrowUpIcon";

export default function QuickTakeItemSkeleton() {
  return (
    <article
      aria-hidden
      className="max-w-full rounded bg-gray-50 border border-gray-100 px-4 py-3 mb-1"
      data-component="QuickTakeItemSkeleton"
    >
      <div className="flex flex-row w-full gap-2 items-center mb-2">
        <div className="flex items-center justify-center gap-1 px-2">
          <div className="h-3 w-5 bg-gray-200 rounded" />
          <SoftArrowUpIcon className="text-gray-400" />
        </div>
        <div className="h-3 w-40 bg-gray-300 rounded" />
        <div className="h-3 w-30 bg-gray-200 rounded" />
        <div className="grow" />
        <div className="flex flex-row gap-1">
          <div className="h-3 w-10 bg-gray-200 rounded" />
        </div>
        <div className="h-3 w-2 bg-gray-200 rounded" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="h-3 w-full bg-gray-200 rounded" />
        <div className="h-3 w-full bg-gray-200 rounded" />
      </div>
    </article>
  );
}
