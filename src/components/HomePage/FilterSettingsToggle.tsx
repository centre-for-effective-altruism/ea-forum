"use client";

import { useFilterSettings } from "@/lib/hooks/useFilterSettings";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function FilterSettingsToggle() {
  const { toggleShowFilterSettings } = useFilterSettings();
  return (
    <Tooltip
      title={
        <Type style="bodySmall">
          Use these buttons to increase or decrease the visibility of posts based on
          topic. Use the &quot;+&quot; button at the end to add additional topics to
          boost or reduce them.
        </Type>
      }
      tooltipClassName="w-[280px] max-w-full"
      placement="bottom-end"
    >
      <Type
        onClick={toggleShowFilterSettings}
        style="loadMore"
        As="button"
        className="cursor-pointer text-gray-600 hover:text-gray-1000"
      >
        Customize feed
      </Type>
    </Tooltip>
  );
}
