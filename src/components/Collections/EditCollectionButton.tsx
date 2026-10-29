"use client";

import { useCallback, useState } from "react";
import type { HandbookEditData } from "@/lib/collections/handbookQueries";
import PencilSquareIcon from "@heroicons/react/24/outline/PencilSquareIcon";
import EditCollectionPopover from "./EditCollectionPopover";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function EditCollectionButton({
  collection,
}: Readonly<{
  collection: HandbookEditData["collection"];
}>) {
  const [open, setOpen] = useState(false);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  return (
    <>
      <Tooltip
        title={<Type style="bodySmall">Edit collection</Type>}
        placement="bottom"
      >
        <button
          type="button"
          onClick={onOpen}
          aria-label="Edit collection"
          data-component="EditCollectionButton"
          className="
            flex items-center cursor-pointer text-gray-600 hover:text-gray-1000
          "
        >
          <PencilSquareIcon className="w-4" />
        </button>
      </Tooltip>
      {open && <EditCollectionPopover collection={collection} onClose={onClose} />}
    </>
  );
}
