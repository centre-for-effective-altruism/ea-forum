import {
  searchContentTypes,
  searchPageInitialLoadSize,
  searchTabs,
} from "@/lib/search/searchPageParams";
import SearchPageColumns from "./SearchPageColumns";
import SearchHitSkeleton from "./SearchHitSkeleton";
import Type from "../../Type";

export default function SearchPageSkeleton() {
  return (
    <SearchPageColumns
      filters={
        <div className="flex flex-col gap-3">
          <div className="bg-gray-200 rounded h-4 w-20" />
          <div className="bg-gray-200 rounded h-3 w-40" />
          <div className="bg-gray-200 rounded h-3 w-32" />
          <div className="bg-gray-200 rounded h-3 w-36" />
        </div>
      }
    >
      <div className="bg-gray-200 rounded h-12 max-w-[720px]" />
      <div className="flex max-w-[720px] border-b border-gray-200 mb-6 overflow-x-auto">
        {searchContentTypes.map((contentType) => (
          <Type
            key={contentType}
            style="bodyLarge"
            className="px-3 py-4 text-gray-600 whitespace-nowrap"
          >
            {searchTabs[contentType].label}
          </Type>
        ))}
      </div>
      <SearchHitSkeleton contentType="Posts" count={searchPageInitialLoadSize} />
    </SearchPageColumns>
  );
}
