"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { rpc } from "@/lib/rpc";
import toast from "react-hot-toast";
import Button from "../Button";
import Type from "../Type";

export default function RebuildSearchIndexes() {
  const [loading, setLoading] = useState(false);

  const onRebuild = useCallback(async () => {
    setLoading(true);
    const toastId = toast.loading("Rebuilding search indexes...");
    try {
      await rpc.search.rebuildIndexes();
      toast.success("Search indexes rebuilt");
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(e instanceof Error ? e.message : String(e));
    }
    toast.dismiss(toastId);
    setLoading(false);
  }, []);

  return (
    <div data-component="RebuildSearchIndexes" className="flex flex-col gap-6">
      <Type style="sectionTitleLarge">Search indexes</Type>
      <Type style="bodyMedium">
        Rebuild every Elasticsearch index with the current mappings and analyzers.
        Documents are copied from the existing indexes in the background, so search
        results may be incomplete for a few minutes afterwards. The old indexes are
        kept and made read-only.
      </Type>
      <div>
        <Button onClick={onRebuild} loading={loading} disabled={loading}>
          Rebuild indexes
        </Button>
      </div>
    </div>
  );
}
