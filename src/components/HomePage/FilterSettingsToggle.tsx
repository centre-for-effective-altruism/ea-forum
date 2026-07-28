"use client";

import { useFilterSettings } from "@/lib/hooks/useFilterSettings";
import Bars3BottomLeftIcon from "@heroicons/react/16/solid/Bars3BottomLeftIcon";
import TextLinkButton from "../TextLinkButton";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function FilterSettingsToggle() {
  const { toggleShowFilterSettings } = useFilterSettings();
  return (
    <Tooltip
      title={<Type style="bodySmall">Boost or hide topics</Type>}
      placement="bottom"
    >
      <TextLinkButton
        onClick={toggleShowFilterSettings}
        className="whitespace-nowrap"
      >
        Customize{" "}
        <span className="inline-flex items-center gap-1 max-[370px]:hidden">
          feed <Bars3BottomLeftIcon className="w-4" />
        </span>
      </TextLinkButton>
    </Tooltip>
  );
}
