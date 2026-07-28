"use client";

import { useCallback } from "react";
import toast from "react-hot-toast";
import ClipboardDocumentListIcon from "@heroicons/react/24/solid/ClipboardDocumentListIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function CopyUserId({ _id }: Readonly<{ _id: string }>) {
  const onCopy = useCallback(async () => {
    await navigator.clipboard.writeText(_id);
    toast.success("User ID copied to clipboard");
  }, [_id]);
  return (
    <Tooltip
      title={<Type style="bodySmall">Click to copy user ID</Type>}
      placement="bottom"
      className="inline-block"
    >
      <button
        data-component="CopyUserId"
        onClick={onCopy}
        className="cursor-pointer text-primary-dark hover:text-primary"
      >
        <ClipboardDocumentListIcon className="w-4 min-w-4" />
      </button>
    </Tooltip>
  );
}
