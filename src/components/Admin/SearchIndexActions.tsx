"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { rpc } from "@/lib/rpc";
import type { DeleteOrphanedIndexesResult } from "@/lib/search/elastic/ElasticExporter";
import toast from "react-hot-toast";
import Button from "../Button";
import Type from "../Type";

type SearchIndexAction = "rebuild" | "deleteOrphaned";

export default function SearchIndexActions() {
  const [runningAction, setRunningAction] = useState<SearchIndexAction | null>(null);
  const [deleteResult, setDeleteResult] =
    useState<DeleteOrphanedIndexesResult | null>(null);

  const runAction = useCallback(
    async (action: SearchIndexAction, message: string, run: () => Promise<void>) => {
      setRunningAction(action);
      const toastId = toast.loading(message);
      try {
        await run();
      } catch (e) {
        console.error(e);
        captureException(e);
        toast.error(e instanceof Error ? e.message : String(e));
      }
      toast.dismiss(toastId);
      setRunningAction(null);
    },
    [],
  );

  const onRebuild = useCallback(
    () =>
      runAction("rebuild", "Rebuilding search indexes...", async () => {
        await rpc.search.rebuildIndexes();
        toast.success("Search indexes rebuilt");
      }),
    [runAction],
  );

  const onDeleteOrphaned = useCallback(() => {
    if (
      !window.confirm(
        "Delete old search indexes? This cannot be undone, and you won't be able to roll back to them.",
      )
    ) {
      return;
    }
    void runAction("deleteOrphaned", "Deleting old search indexes...", async () => {
      const result = await rpc.search.deleteOrphanedIndexes();
      setDeleteResult(result);
      toast.success(
        `Deleted ${result.deleted.length} old ${result.deleted.length === 1 ? "index" : "indexes"}`,
      );
    });
  }, [runAction]);

  return (
    <div data-component="SearchIndexActions" className="flex flex-col gap-6">
      <Type style="sectionTitleLarge">Search indexes</Type>
      <section className="flex flex-col gap-3">
        <Type style="bodyMedium">
          Rebuild every Elasticsearch index with the current mappings and analyzers.
          Documents are copied from the existing indexes in the background, so search
          results may be incomplete for a few minutes afterwards. The old indexes are
          kept and made read-only.
        </Type>
        <div>
          <Button
            onClick={onRebuild}
            loading={runningAction === "rebuild"}
            disabled={!!runningAction}
          >
            Rebuild indexes
          </Button>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <Type style="bodyMedium">
          Delete the old indexes left behind by a rebuild. An old index is only
          deleted once its collection&apos;s live index has finished copying and has
          at least as many documents.
        </Type>
        <div>
          <Button
            variant="greyOutlined"
            onClick={onDeleteOrphaned}
            loading={runningAction === "deleteOrphaned"}
            disabled={!!runningAction}
          >
            Delete old indexes
          </Button>
        </div>
        {deleteResult && (
          <div className="flex flex-col gap-1">
            <Type style="bodySmall">
              {deleteResult.deleted.length
                ? `Deleted: ${deleteResult.deleted.join(", ")}`
                : "No old indexes were deleted"}
            </Type>
            {deleteResult.skipped.map(({ name, reason }) => (
              <Type key={name} style="bodySmall" className="text-warning">
                Skipped {name}: {reason}
              </Type>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
