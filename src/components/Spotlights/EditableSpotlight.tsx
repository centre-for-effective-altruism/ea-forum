"use client";

import { useCallback, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { rpc } from "@/lib/rpc";
import type { SpotlightBase } from "@/lib/spotlights/spotlightQueries";
import toast from "react-hot-toast";
import Spotlight from "./Spotlight";
import Type from "../Type";
import Link from "../Link";

export default function EditableSpotlight({
  spotlight,
}: Readonly<{
  spotlight: SpotlightBase;
}>) {
  const [deleted, setDeleted] = useState(false);

  const onDelete = useCallback(async () => {
    if (!window.confirm("Delete spotlight? This cannot be undone")) {
      return;
    }
    const toastId = toast.loading("Deleting spotlight...");
    try {
      await rpc.spotlights.delete({ spotlightId: spotlight._id });
      setDeleted(true);
    } catch (e) {
      console.error(e);
      captureException(e);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
    toast.dismiss(toastId);
  }, [spotlight]);

  if (deleted) {
    return null;
  }

  return (
    <div
      data-component="EditableSpotlight"
      className="w-full flex flex-col gap-1 items-end"
    >
      <Spotlight spotlight={spotlight} />
      <Type style="bodyHeavy" className="flex items-center gap-3">
        <button
          onClick={onDelete}
          className="cursor-pointer text-primary-dark hover:text-primary"
        >
          Delete
        </button>
        <Link
          href={`/admin/spotlights/${spotlight._id}`}
          className="text-primary-dark hover:text-primary"
        >
          Edit
        </Link>
      </Type>
    </div>
  );
}
