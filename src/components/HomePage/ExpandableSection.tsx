"use client";

import type { ReactNode } from "react";
import ChevronRightIcon from "@heroicons/react/16/solid/ChevronRightIcon";
import clsx from "clsx";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function ExpandableSection({
  title,
  rightNode,
  expanded,
  toggleExpanded,
  className,
  children,
}: Readonly<{
  title: string;
  rightNode?: ReactNode;
  expanded: boolean;
  toggleExpanded: () => void;
  className?: string;
  children: ReactNode;
}>) {
  return (
    <div data-component="ExpandableSection" className={className}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-[6px] grow mb-2">
          <Type style="sectionTitleLarge">{title}</Type>
          <Tooltip
            title={<Type style="bodySmall">{expanded ? "Collapse" : "Expand"}</Type>}
            placement="bottom-start"
            className="flex items-center translate-y-px"
          >
            <button onClick={toggleExpanded} className="cursor-pointer">
              <ChevronRightIcon
                className={clsx(
                  "w-4 transition-transform duration-200",
                  expanded && "rotate-90",
                )}
              />
            </button>
          </Tooltip>
        </div>
        {rightNode && <div>{rightNode}</div>}
      </div>
      {expanded && children}
    </div>
  );
}
