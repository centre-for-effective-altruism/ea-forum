import type { FC } from "react";
import {
  anonymousReactionPalette,
  publicReactionPalette,
  ReactionOption,
} from "@/lib/votes/reactions";
import Type from "../Type";

const PaletteItem: FC<ReactionOption> = ({ Component, label }) => {
  return (
    <button
      className="
        cursor-pointer flex items-center py-2
        hover:bg-gray-100 rounded
      "
    >
      <div className="text-primary w-8 min-w-8 ml-1">
        <Component className="w-[18px] h-[18px]" />
      </div>
      <Type style="bodyMedium" className="text-gray-900 mr-4">
        {label}
      </Type>
    </button>
  );
};

export default function ReactionPalette() {
  return (
    <div
      data-component="ReactionPalette"
      className="
        bg-gray-0 rounded shadow p-2 border border-gray-100 flex flex-col
      "
    >
      <Type style="sectionTitleSmall" className="mt-[6px] mb-1 ml-1 !text-[11px]">
        Anonymous
      </Type>
      {anonymousReactionPalette.map((reaction) => (
        <PaletteItem key={reaction.name} {...reaction} />
      ))}
      <hr className="border-gray-200 mt-2" />
      <Type style="sectionTitleSmall" className="mt-4 mb-1 ml-1 !text-[11px]">
        Non-anonymous
      </Type>
      {publicReactionPalette.map((reaction) => (
        <PaletteItem key={reaction.name} {...reaction} />
      ))}
    </div>
  );
}
