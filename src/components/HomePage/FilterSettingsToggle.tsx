"use client";

import { useFilterSettings } from "@/lib/hooks/useFilterSettings";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function FilterSettingsToggle() {
  const { toggleShowFilterSettings } = useFilterSettings();
  return (
    <Tooltip
      title={<Type style="bodySmall">Boost or hide topics to shape your feed</Type>}
      tooltipClassName="w-[280px] max-w-full"
      placement="bottom-end"
    >
      <Type
        onClick={toggleShowFilterSettings}
        style="loadMore"
        As="button"
        className="inline-block cursor-pointer text-gray-600 hover:bg-gray-100 rounded px-2 py-1 -mx-2 -my-1"
      >
        Customize <span className="max-[370px]:hidden">feed</span>
      </Type>
    </Tooltip>
  );
}
