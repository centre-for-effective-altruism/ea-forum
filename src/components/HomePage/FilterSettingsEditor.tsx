"use client";

import { FC, ReactNode } from "react";
import { useFilterSettings } from "@/lib/hooks/useFilterSettings";
import {
  defaultVisibilityTagById,
  FilterMode,
  filterModeToString,
  FilterTag,
  subscribePower,
} from "@/lib/filterSettings";
import EyeSlashIcon from "@heroicons/react/16/solid/EyeSlashIcon";
import clsx from "clsx";
import Tooltip from "../Tooltip";
import Type, { typeStyles } from "../Type";

const Button: FC<{
  secondary?: boolean;
  children: ReactNode;
}> = ({ secondary, children }) => {
  return (
    <Type
      As="button"
      style="bodyMedium"
      className={clsx(
        "cursor-pointer bg-gray-0 hover:bg-gray-100 border-1 border-gray-1000/15",
        "rounded-[3px] flex items-center justify-center px-[10px] py-[6px]",
        secondary ? "text-gray-600" : "text-primary",
      )}
    >
      {children}
    </Type>
  );
};

const OptionButton: FC<{
  name: ReactNode;
  description?: ReactNode;
  active?: boolean;
}> = ({ name, description, active }) => {
  return (
    <Tooltip
      title={description}
      tooltipClassName="w-[280px] max-w-full"
      placement="bottom-start"
    >
      <Type
        As="button"
        style="bodySmall"
        className={clsx(
          "cursor-pointer rounded-[2px] px-2 py-[2px]",
          active
            ? "text-primary-dark bg-gray-200"
            : "text-gray-600 hover:bg-gray-100/80",
        )}
      >
        {name}
      </Type>
    </Tooltip>
  );
};

const FilterButton: FC<{
  name: ReactNode;
  description: ReactNode;
  mode: FilterMode;
  removable?: boolean;
}> = ({ name, description, mode, removable }) => {
  return (
    <Tooltip
      title={
        <div className="flex flex-col flex-wrap gap-3 p-3 border border-gray-200 rounded">
          <div className="flex">
            <OptionButton
              name="Hidden"
              active={mode === "Hidden"}
              description={
                <Type style="bodySmall">
                  <em>Hidden.</em> Posts with this topic will be not appear in
                  frontpage posts.
                </Type>
              }
            />
            <OptionButton
              name="Reduced"
              active={mode === "Reduced"}
              description={
                <Type style="bodySmall">
                  <em>Reduced.</em> Posts with this topic with be shown as if they
                  had half as much karma.
                </Type>
              }
            />
            <OptionButton
              name="Default"
              active={mode === "Default"}
              description={
                <Type style="bodySmall">
                  This topic will have default filtering and sorting.
                </Type>
              }
            />
            <OptionButton
              name="Subscribed"
              active={mode === "Subscribed"}
              description={
                <Type style="bodySmall">
                  <em>+{subscribePower}.</em> These posts will be shown more often
                  (as though their score were {subscribePower} points higher).
                </Type>
              }
            />
            <div className="grow px-[2px]">
              <Tooltip
                title={
                  <Type style="bodySmall">
                    Enter a custom karma filter. Values between 0 and 1 are
                    multiplicative, other values are absolute changes to the karma of
                    the post.
                  </Type>
                }
                tooltipClassName="w-[280px] max-w-full"
              >
                <input
                  type="number"
                  placeholder="Other"
                  className={clsx(
                    "w-[56px] outline-none placeholder:text-gray-600",
                    typeStyles.bodySmall,
                  )}
                />
              </Tooltip>
            </div>
            {removable && <OptionButton name="Remove" />}
          </div>
          {description}
        </div>
      }
      tooltipClassName="bg-gray-0! text-gray-900! p-0! shadow w-[460px] max-w-full"
      placement="bottom-start"
      interactable
    >
      <Button>{name}</Button>
    </Tooltip>
  );
};

const FilterModeIcon: FC<{ filterMode: FilterMode }> = ({ filterMode }) => {
  const label = filterModeToString(filterMode);
  switch (label) {
    case "Reduced":
      return "-";
    case "Subscribed":
      return "+";
    case "Hidden":
      return <EyeSlashIcon className="w-3 ml-1" />;
    case "": // Fallthrough
    case "Required":
      return "";
    default: {
      return label.startsWith("+") ? "+" : "-";
    }
  }
};

const TagFilterButton: FC<FilterTag> = ({ tagId, tagName, filterMode }) => {
  if (filterMode === "TagDefault") {
    filterMode = defaultVisibilityTagById(tagId)?.filterMode ?? "Default";
  }

  return (
    <FilterButton
      name={
        <>
          {tagName} <FilterModeIcon filterMode={filterMode} />
        </>
      }
      mode={filterMode}
      description={<Type>TODO Tag description</Type>}
      removable
    />
  );
};

export default function FilterSettingsEditor({
  className,
}: Readonly<{
  className?: string;
}>) {
  const { showFilterSettings, filterSettings } = useFilterSettings();
  if (!showFilterSettings) {
    return null;
  }
  return (
    <div
      data-component="FilterSettingsEditor"
      className={clsx("flex items-center gap-1 flex-wrap", className)}
    >
      {filterSettings.tags?.map((filterTag) => (
        <TagFilterButton key={filterTag.tagId} {...filterTag} />
      ))}
      <FilterButton
        name={
          <>
            Personal <FilterModeIcon filterMode={filterSettings.personalBlog} />
          </>
        }
        mode={filterSettings.personalBlog}
        description={
          <Type>
            By default, the home page only displays frontpage posts, which are
            selected by moderators as especially interesting or useful to people with
            interest in doing good effectively. Personal posts get to have looser
            standards of relevance, and may include topics that could lead to more
            emotive or heated discussion (e.g. politics), which are generally
            excluded from frontpage.
          </Type>
        }
      />
      <Tooltip title={<Type style="bodySmall">Add topic filter</Type>}>
        <Button secondary>+</Button>
      </Tooltip>
    </div>
  );
}
