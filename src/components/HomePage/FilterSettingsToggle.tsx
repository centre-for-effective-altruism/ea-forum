"use client";

import { useFilterSettings } from "@/lib/hooks/useFilterSettings";
import Tooltip from "../Tooltip";
import Type from "../Type";
import TextLinkButton from "../TextLinkButton";

export default function FilterSettingsToggle() {
  const { toggleShowFilterSettings } = useFilterSettings();
  return (
    <Tooltip
      title={<Type style="bodySmall">Boost or hide topics</Type>}
      placement="bottom-end"
    >
      <TextLinkButton onClick={toggleShowFilterSettings}>
        Customize <span className="max-[370px]:hidden">feed</span>
      </TextLinkButton>
    </Tooltip>
  );
}
