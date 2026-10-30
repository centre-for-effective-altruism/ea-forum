"use client";

import BellIcon from "@heroicons/react/24/outline/BellIcon";
import ArrowRightIcon from "@heroicons/react/24/outline/ArrowRightIcon";
import { useSearchPage } from "./useSearchPage";
import {
  searchPageInitialLoadSize,
  searchPageLoadMoreSize,
} from "@/lib/search/searchPageParams";
import SearchHitSkeleton from "./SearchHitSkeleton";
import InfiniteLoadTrigger from "../../InfiniteLoadTrigger";
import SearchHit from "./SearchHit";
import Link from "../../Link";
import Type from "../../Type";

const notifyContentTypes = new Set(["Posts", "Comments"]);

export default function SearchPageResults() {
  const { state, hits, totalHits, loading, error, canLoadMore, loadMore } =
    useSearchPage();
  const { query, contentType } = state;
  const isInitialLoad = loading && hits.length === 0;
  return (
    <section
      id="search-results"
      role="tabpanel"
      aria-labelledby={`search-tab-${contentType}`}
      data-component="SearchPageResults"
      className="flex flex-col gap-4 pb-20"
    >
      <div className="flex items-center gap-4 min-h-5 px-3">
        {isInitialLoad ? (
          <div className="bg-gray-200 rounded h-3 w-20" />
        ) : (
          !error && (
            <Type style="bodySmall" className="text-gray-600">
              {totalHits} result{totalHits === 1 ? "" : "s"}
            </Type>
          )
        )}
        {query && notifyContentTypes.has(contentType) && (
          <Link
            href={`/keywords?add=${encodeURIComponent(query)}`}
            className="flex items-center gap-1 text-primary hover:text-primary-dark"
          >
            <BellIcon className="w-4" />
            <Type style="bodySmall" As="span" className="font-[600]">
              Get notified
            </Type>
          </Link>
        )}
      </div>
      {query && contentType === "Users" && (
        <Link
          href={`/people-directory?query=${encodeURIComponent(query)}`}
          className="
            flex items-center gap-2 max-w-[720px] px-3 py-4 rounded
            bg-primary/5 text-primary hover:opacity-80
          "
        >
          <ArrowRightIcon className="w-4" />
          <Type style="bodyMedium" As="span" className="font-[600]">
            View results in People Directory
          </Type>
        </Link>
      )}
      {error ? (
        <Type style="body" className="text-error p-3">
          Something went wrong while searching. Please try again.
        </Type>
      ) : (
        <>
          {!loading && hits.length === 0 && (
            <Type style="body" className="text-gray-600 p-3">
              No results found
            </Type>
          )}
          <div className="flex flex-col gap-2">
            {hits.map((hit) => (
              <SearchHit key={hit._id} contentType={contentType} hit={hit} />
            ))}
            {loading && (
              <SearchHitSkeleton
                contentType={contentType}
                count={
                  hits.length ? searchPageLoadMoreSize : searchPageInitialLoadSize
                }
              />
            )}
          </div>
          {canLoadMore && !loading && <InfiniteLoadTrigger onTrigger={loadMore} />}
        </>
      )}
    </section>
  );
}
