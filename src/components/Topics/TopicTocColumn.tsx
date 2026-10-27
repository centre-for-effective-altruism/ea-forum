"use client";

import { useCallback, useState, type ReactNode } from "react";
import ListBulletIcon from "@heroicons/react/24/outline/ListBulletIcon";
import clsx from "clsx";
import { useTracking } from "@/lib/analyticsEvents";
import Type from "../Type";

export default function TopicTocColumn({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { captureEvent } = useTracking();
  const [hidden, setHidden] = useState(false);

  const toggleHidden = useCallback(() => {
    setHidden(!hidden);
    captureEvent("toggleHideContents", { hidden: !hidden });
  }, [hidden, captureEvent]);

  return (
    <div
      data-component="TopicTocColumn"
      className="
        sticky left-0 top-18 pl-8 pt-5 pb-12 flex flex-col gap-6
        max-h-[calc(100vh-72px)] overflow-y-auto
      "
    >
      <button
        type="button"
        onClick={toggleHidden}
        aria-expanded={!hidden}
        className="
          flex items-center gap-2 text-gray-600 hover:text-gray-1000
          cursor-pointer select-none
        "
      >
        <ListBulletIcon className="w-5 shrink-0" />
        <Type style="bodyMedium">{hidden ? "Show" : "Hide"} table of contents</Type>
      </button>
      <div className={clsx("flex flex-col gap-8", hidden && "hidden")}>
        {children}
      </div>
    </div>
  );
}
