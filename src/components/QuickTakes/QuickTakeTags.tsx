import type { QuickTakesTagsProps } from "@/lib/hooks/useQuickTakesTags";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import TruncationContainer from "../TruncationContainer";
import Type from "../Type";
import clsx from "clsx";

export default function QuickTakeTags({
  tags,
  frontpageTagId,
  frontpage,
  selectedTagIds,
  onTagSelected,
  onTagRemoved,
  className,
}: Readonly<QuickTakesTagsProps & { className?: string }>) {
  return (
    <div
      data-component="QuickTakeTags"
      className={clsx("mt-2 -mb-1 whitespace-nowrap flex items-center", className)}
    >
      <TruncationContainer
        items={[
          <Type style="bodySmall" className="font-[600]! mr-1" key="settopic">
            Set topic
          </Type>,
          ...tags.map((tag) => {
            const selected =
              tag._id === frontpageTagId
                ? frontpage
                : selectedTagIds.includes(tag._id);
            const onClick = selected ? onTagRemoved : onTagSelected;
            return (
              <Type
                key={tag._id}
                role="checkbox"
                aria-checked={selected}
                onClick={onClick.bind(null, tag)}
                style="bodySmall"
                className={clsx(
                  "cursor-pointer select-none rounded-xs px-[6px] py-px",
                  "flex items-center gap-[2px]",
                  selected
                    ? "text-gray-900 bg-gray-200 hover:bg-gray-300"
                    : "text-gray-500 bg-gray-100 hover:bg-gray-200",
                )}
              >
                {tag.shortName || tag.name}
                {selected && <XMarkIcon className="w-3" />}
              </Type>
            );
          }),
        ]}
        gap={4}
        canShowMore
        className="flex-wrap"
      />
    </div>
  );
}
