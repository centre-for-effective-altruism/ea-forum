"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import clsx from "clsx";
import { rpc } from "@/lib/rpc";
import { usePolling } from "@/lib/hooks/usePolling";
import type { SearchIndexStatus } from "@/lib/search/elastic/ElasticExporter";
import Loading from "../Loading";
import Type from "../Type";

type CollectionState = "copying" | "empty" | "incomplete" | "ready";

const getCollectionState = ({ indexes }: SearchIndexStatus): CollectionState => {
  const liveIndex = indexes.find(({ isLive }) => isLive);
  if (liveIndex?.reindexProgress) {
    return "copying";
  }
  const previousIndex = indexes.find(
    ({ createdAt }) => liveIndex && createdAt < liveIndex.createdAt,
  );
  if (!liveIndex || liveIndex.docsCount === 0) {
    return "empty";
  }
  if (previousIndex && liveIndex.docsCount < previousIndex.docsCount) {
    return "incomplete";
  }
  return "ready";
};

const collectionStateLabels: Record<CollectionState, string> = {
  copying: "Copying documents",
  empty: "No documents",
  incomplete: "Fewer documents than the previous index",
  ready: "Ready",
};

const formatProgress = ({ copied, total }: { copied: number; total: number }) =>
  total > 0 ? `${Math.floor((100 * copied) / total)}%` : "starting";

const CollectionStatus = ({ status }: { status: SearchIndexStatus }) => {
  const state = getCollectionState(status);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-3">
        <Type style="bodyMedium" className="font-bold">
          {status.collectionName}
        </Type>
        <Type
          style="bodySmall"
          className={clsx(
            state === "copying" && "text-warning",
            (state === "empty" || state === "incomplete") && "text-error",
            state === "ready" && "text-gray-600",
          )}
        >
          {collectionStateLabels[state]}
        </Type>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <Type style="bodySmall" As="th" className="py-1 pr-2 font-bold">
              Index
            </Type>
            <Type style="bodySmall" As="th" className="py-1 pr-2 font-bold">
              Created
            </Type>
            <Type
              style="bodySmall"
              As="th"
              className="py-1 pr-2 font-bold text-right"
            >
              Documents
            </Type>
            <Type style="bodySmall" As="th" className="py-1 font-bold">
              State
            </Type>
          </tr>
        </thead>
        <tbody>
          {status.indexes.map(
            ({ name, createdAt, docsCount, isLive, reindexProgress }) => (
              <tr key={name} className="border-b border-gray-200">
                <Type style="bodySmall" As="td" className="py-1 pr-2 break-all">
                  {name}
                </Type>
                <Type style="bodySmall" As="td" className="py-1 pr-2">
                  {new Date(createdAt).toLocaleString()}
                </Type>
                <Type style="bodySmall" As="td" className="py-1 pr-2 text-right">
                  {docsCount.toLocaleString()}
                </Type>
                <Type
                  style="bodySmall"
                  As="td"
                  className={clsx("py-1", !isLive && "text-gray-600")}
                >
                  {isLive ? "Live" : "Old"}
                  {reindexProgress && `, copying ${formatProgress(reindexProgress)}`}
                </Type>
              </tr>
            ),
          )}
          {status.indexes.length === 0 && (
            <tr>
              <td className="py-1" colSpan={4}>
                <Type style="bodySmall" className="text-error">
                  No indexes found
                </Type>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
};

export default function SearchIndexStatuses() {
  const [statuses, setStatuses] = useState<SearchIndexStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setStatuses(await rpc.search.indexStatuses());
      setError(null);
    } catch (e) {
      console.error(e);
      captureException(e);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  usePolling({ callback: refetch, intervalMs: 5000 });

  const isCopying = statuses?.some(
    (status) => getCollectionState(status) === "copying",
  );

  return (
    <div data-component="SearchIndexStatuses" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Type style="sectionTitleLarge">Status</Type>
        <Type style="bodySmall" className="text-gray-600">
          {isCopying
            ? "A rebuild is still copying documents into the new indexes."
            : "Updates every 5 seconds."}
        </Type>
      </div>
      {error && (
        <Type style="bodySmall" className="text-error">
          Failed to load index status: {error}
        </Type>
      )}
      {!statuses && !error && <Loading />}
      {statuses?.map((status) => (
        <CollectionStatus key={status.collectionName} status={status} />
      ))}
    </div>
  );
}
