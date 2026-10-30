import type { SearchContentType } from "@/lib/search/searchPageParams";
import range from "lodash/range";
import clsx from "clsx";

export default function SearchHitSkeleton({
  contentType,
  count,
}: Readonly<{
  contentType: SearchContentType;
  count: number;
}>) {
  return range(count).map((index) => (
    <div
      key={index}
      aria-hidden
      data-component="SearchHitSkeleton"
      className="flex gap-3 max-w-[720px] px-3 py-2"
    >
      {contentType === "Users" && (
        <div className="rounded-full shrink-0 w-9 h-9 bg-gray-200" />
      )}
      <div className="flex flex-col gap-2 grow min-w-0 py-1">
        <div className="bg-gray-300 rounded h-4 w-80" />
        <div
          className={clsx(
            "bg-gray-200 rounded h-3",
            contentType === "Tags" ? "w-16" : "w-40",
          )}
        />
        <div className="bg-gray-200 rounded h-3 w-full" />
        <div className="bg-gray-200 rounded h-3 w-2/3" />
      </div>
    </div>
  ));
}
