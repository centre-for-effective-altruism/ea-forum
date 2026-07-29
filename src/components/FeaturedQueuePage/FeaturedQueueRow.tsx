"use client";

import { MouseEvent } from "react";
import clsx from "clsx";
import StarIcon from "@heroicons/react/24/solid/StarIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ArrowTopRightOnSquareIcon from "@heroicons/react/24/outline/ArrowTopRightOnSquareIcon";
import Type from "../Type";
import TagChip from "../Tags/TagChip";
import type { FeaturedQueueItem } from "@/lib/featuredQueue/featuredQueueQueries";

const MAX_TAGS = 3;

const iconButtonClass =
  "flex items-center justify-center p-1.5 rounded hover:bg-gray-200 cursor-pointer";

const stop = (fn: () => void) => (ev: MouseEvent) => {
  ev.stopPropagation();
  fn();
};

export default function FeaturedQueueRow({
  post,
  featured,
  dismissed,
  selected,
  onSelect,
  onToggleFeature,
  onToggleDismiss,
  onOpen,
}: Readonly<{
  post: FeaturedQueueItem;
  featured: boolean;
  dismissed: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggleFeature: () => void;
  onToggleDismiss: () => void;
  onOpen: () => void;
}>) {
  const tags = (post.tags ?? []).slice(0, MAX_TAGS);

  return (
    <div
      data-component="FeaturedQueueRow"
      className={clsx(
        "relative mb-0.5 overflow-hidden rounded",
        selected && "ring-1 ring-primary",
      )}
    >
      <div
        onClick={onSelect}
        className="relative flex cursor-pointer items-center gap-3 bg-gray-0 py-2.5 pr-3 pl-4"
      >
        <div
          className={clsx(
            "absolute top-0 bottom-0 left-0 w-1.5",
            featured ? "bg-primary" : dismissed ? "bg-gray-400" : "bg-transparent",
          )}
        />
        {featured && (
          <span className="inline-block shrink-0 rounded border border-primary bg-primary px-[7px] py-0.5 text-[11px] leading-4 font-[700] tracking-[0.02em] text-always-white uppercase">
            Feature
          </span>
        )}
        {dismissed && (
          <span className="inline-block shrink-0 rounded border border-gray-400 bg-gray-400 px-[7px] py-0.5 text-[11px] leading-4 font-[700] tracking-[0.02em] text-always-white uppercase">
            Dismiss
          </span>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Type
            style="postTitle"
            className={clsx(
              "min-w-0 flex-1 truncate",
              dismissed ? "text-gray-500 line-through" : "text-gray-900",
            )}
          >
            {post.title}
          </Type>
          {tags.length > 0 && (
            <div className="flex shrink-0 items-center gap-1">
              {tags.map((tag) => (
                <TagChip key={tag._id} tag={tag} variant="small" />
              ))}
            </div>
          )}
        </div>
        <div className="max-w-[170px] shrink-0 truncate text-[13px] font-[500] text-gray-600">
          {post.user?.displayName ?? "—"}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={stop(onToggleFeature)}
            title="Feature (F)"
            className={clsx(
              iconButtonClass,
              featured ? "text-primary" : "text-gray-400",
            )}
          >
            <StarIcon className="h-4 w-4" />
          </button>
          <button
            onClick={stop(onToggleDismiss)}
            title="Dismiss (X)"
            className={clsx(
              iconButtonClass,
              dismissed ? "text-error" : "text-gray-400",
            )}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
          <button
            onClick={stop(onOpen)}
            title="Open in new tab (O)"
            className={clsx(iconButtonClass, "text-gray-400")}
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
