"use client";

import type { FC } from "react";
import { useAllPosts } from "./AllPostsContext";
import {
  ALL_POSTS_LOW_KARMA_THRESHOLD,
  AllPostsFilter,
  allPostsFilters,
  AllPostsSortedBy,
  allPostsSortedBys,
  AllPostsTimeframe,
  allPostsTimeframes,
} from "@/lib/posts/allPostsSettings";
import Checkbox from "../Forms/Checkbox";
import Tooltip from "../Tooltip";
import Type from "../Type";
import clsx from "clsx";

const ListItem: FC<{
  label: string;
  tooltip?: string;
  onClick: () => void;
  active: boolean;
}> = ({ label, tooltip, onClick, active }) => {
  return (
    <Tooltip
      placement="left"
      title={
        tooltip ? (
          <Type style="bodySmall" className="max-w-65">
            {tooltip}
          </Type>
        ) : null
      }
    >
      <Type
        style="bodySmall"
        As="button"
        onClick={onClick}
        className={clsx(
          "cursor-pointer block ml-2",
          active ? "text-gray-1000" : "text-gray-600 hover:text-gray-800",
        )}
      >
        {label}
      </Type>
    </Tooltip>
  );
};

export default function AllPostsSettings({
  className,
}: Readonly<{
  className?: string;
}>) {
  const { showOptions, settings, onUpdateSetting } = useAllPosts();

  if (!showOptions) {
    return (
      <hr
        data-component="AllPostsSettings"
        className={clsx("border-gray-300", className)}
      />
    );
  }

  const timeframes = Object.keys(allPostsTimeframes) as AllPostsTimeframe[];
  const sortedBys = Object.keys(allPostsSortedBys) as AllPostsSortedBy[];
  const filters = Object.keys(allPostsFilters) as AllPostsFilter[];

  return (
    <section
      data-component="AllPostsSettings"
      className={clsx(
        "flex gap-4 flex-wrap justify-between rounded px-6 py-4",
        "bg-surface-floating border-1 border-comment-border",
        className,
      )}
    >
      <div>
        <Type style="sectionTitleSmall" className="mb-1">
          Timeframe
        </Type>
        {timeframes.map((timeframe) => (
          <ListItem
            key={timeframe}
            {...allPostsTimeframes[timeframe]}
            onClick={() => onUpdateSetting("timeframe", timeframe)}
            active={settings.timeframe === timeframe}
          />
        ))}
      </div>
      <div>
        <Type style="sectionTitleSmall" className="mb-1">
          Sorted by
        </Type>
        {sortedBys.map((sortedBy) => (
          <ListItem
            key={sortedBy}
            {...allPostsSortedBys[sortedBy]}
            onClick={() => onUpdateSetting("sortedBy", sortedBy)}
            active={settings.sortedBy === sortedBy}
          />
        ))}
      </div>
      <div>
        <Type style="sectionTitleSmall" className="mb-1">
          Filtered by
        </Type>
        {filters.map((filter) => (
          <ListItem
            key={filter}
            {...allPostsFilters[filter]}
            onClick={() => onUpdateSetting("filter", filter)}
            active={settings.filter === filter}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1 pr-4">
        <Tooltip
          placement="left"
          title={
            <Type style="bodySmall">
              <div>
                By default, posts below {ALL_POSTS_LOW_KARMA_THRESHOLD} karma are
                hidden.
              </div>
              <div>Toggle to show them.</div>
            </Type>
          }
        >
          <Checkbox
            label={{ id: "showLowKarma", text: "Show low karma" }}
            checked={settings.showLowKarma}
            onChange={() =>
              onUpdateSetting("showLowKarma", String(!settings.showLowKarma))
            }
            className="text-gray-600"
          />
        </Tooltip>
        <Tooltip
          placement="left"
          title={
            <Type style="bodySmall">
              <div>By default, events are hidden.</div>
              <div>Toggle to show them.</div>
            </Type>
          }
        >
          <Checkbox
            label={{ id: "showEvents", text: "Show events" }}
            checked={settings.showEvents}
            onChange={() =>
              onUpdateSetting("showEvents", String(!settings.showEvents))
            }
            className="text-gray-600"
          />
        </Tooltip>
        <Tooltip
          placement="left"
          title={
            <Type style="bodySmall">
              <div>By default, Community posts are shown.</div>
              <div>Toggle to hide them.</div>
            </Type>
          }
        >
          <Checkbox
            label={{ id: "showCommunity", text: "Show Community" }}
            checked={settings.showCommunity}
            onChange={() =>
              onUpdateSetting("showCommunity", String(!settings.showCommunity))
            }
            className="text-gray-600"
          />
        </Tooltip>
      </div>
    </section>
  );
}
