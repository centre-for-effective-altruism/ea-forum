"use client";

import { useCallback } from "react";
import { useQuickTakesCommunityContext } from "./QuickTakesCommunityContext";
import CheckIcon from "@heroicons/react/16/solid/CheckIcon";
import clsx from "clsx";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function QuickTakesCommunityToggle() {
  const { showCommunity, setShowCommunity } = useQuickTakesCommunityContext();
  const onToggle = useCallback(() => {
    setShowCommunity((checked) => !checked);
  }, [setShowCommunity]);
  return (
    <Tooltip
      title={
        <Type style="bodySmall">Show quick takes tagged &quot;Community&quot;</Type>
      }
    >
      <Type
        style="loadMore"
        role="button"
        aria-label={showCommunity ? "Hide community" : "Show community"}
        onClick={onToggle}
        className="
          flex items-center gap-1 cursor-pointer select-none
          text-gray-600 hover:text-gray-1000
        "
      >
        <div
          aria-hidden
          className={clsx(
            "w-[14px] h-[14px] border-1 rounded-[2px]",
            "flex items-center justify-center",
            showCommunity ? "bg-primary border-primary" : "border-gray-600",
          )}
        >
          {showCommunity && <CheckIcon className="w-full text-background" />}
        </div>
        Show community
      </Type>
    </Tooltip>
  );
}
