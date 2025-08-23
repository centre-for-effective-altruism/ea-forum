import SoftArrowUpIcon from "../Icons/SoftArrowUpIcon";

export default function PostsItemSkeleton() {
  return (
    <article
      aria-hidden
      className="w-full max-w-full h-[60px] rounded bg-gray-50 border border-gray-100"
      data-component="PostsItemSkeleton"
    >
      <div
        className={`
          w-full max-w-full h-full px-4 py-2
          grid grid-cols-[min-content_1fr_min-content_min-content] gap-4
        `}
      >
        <div className="flex flex-col items-center justify-center gap-1 px-2">
          <SoftArrowUpIcon className="text-gray-400" />
          <div className="h-3 w-5 bg-gray-200" />
        </div>
        <div className="flex flex-col justify-center gap-2">
          <div className="h-3 w-80 bg-gray-300" />
          <div className="h-3 w-50 bg-gray-200" />
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-8 bg-gray-200" />
        </div>
        <div className="flex items-center">
          <div className="h-5 w-2 bg-gray-200" />
        </div>
      </div>
    </article>
  );
}
