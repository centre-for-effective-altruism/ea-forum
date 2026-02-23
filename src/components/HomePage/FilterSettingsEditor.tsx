"use client";

import {
  ChangeEvent,
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { TagBase } from "@/lib/tags/tagQueries";
import { useFilterSettings } from "@/lib/hooks/useFilterSettings";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import { rpc } from "@/lib/rpc";
import {
  defaultVisibilityTagById,
  FilterMode,
  filterModeToString,
  FilterTag,
  standardFilterModes,
  subscribePower,
} from "@/lib/filterSettings";
import EyeSlashIcon from "@heroicons/react/16/solid/EyeSlashIcon";
import clsx from "clsx";
import Type, { typeStyles } from "../Type";
import Tooltip from "../Tooltip";
import Loading from "../Loading";
import TagSelect from "../Tags/TagSelect";
import TagBody from "../ContentStyles/TagBody";
import Link from "../Link";

const INPUT_PAUSE_MILLISECONDS = 1500;

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
  tagId?: string; // If undefined then this is personal
  name: "Hidden" | "Reduced" | "Default" | "Subscribed" | "Remove";
  description?: ReactNode;
  active?: boolean;
}> = ({ tagId, name, description, active }) => {
  const { updateFilterTag, removeFilterTag, updatePersonal } = useFilterSettings();
  const onClick = useCallback(() => {
    if (tagId) {
      if (name === "Remove") {
        removeFilterTag(tagId);
      } else {
        updateFilterTag(tagId, name);
      }
    } else if (name !== "Remove") {
      updatePersonal(name);
    }
  }, [tagId, name, updateFilterTag, removeFilterTag, updatePersonal]);
  return (
    <Tooltip
      title={description}
      tooltipClassName="w-[280px] max-w-full"
      placement="bottom-start"
    >
      <Type
        onClick={onClick}
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
  tagId?: string; // If undefined then this is personal
  name: ReactNode;
  description: ReactNode;
  mode: FilterMode;
}> = ({ tagId, name, description, mode }) => {
  // When entering a standard value such as 0.5 for "reduced" or 25 for
  // "subscribed" we want to select the button rather than show the input text.
  // This makes it impossible to type, for instance, 0.55 or 250. To avoid this
  // problem we delay for a small amount of time after the user inputs one of
  // these values before we clear the input field in case they continue to type.
  const [inputTime, setInputTime] = useState(0);
  const { updateFilterTag, updatePersonal } = useFilterSettings();

  const updateMode = useCallback(
    (filterMode: FilterMode, inputTime = 0) => {
      if (tagId) {
        updateFilterTag(tagId, filterMode);
      } else {
        updatePersonal(filterMode);
      }
      setInputTime(inputTime);
    },
    [tagId, updateFilterTag, updatePersonal],
  );

  const onCustomInput = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(ev.target.value);
      if (Number.isNaN(parsed)) {
        updateMode(0);
      } else {
        const value =
          parsed <= 0 || parsed >= 1
            ? Math.round(parsed)
            : Math.floor(parsed * 100) / 100;
        const now = Date.now();
        updateMode(value, now);
        if (standardFilterModes.includes(value)) {
          setTimeout(() => {
            setInputTime((inputTime) => (inputTime === now ? 0 : inputTime));
          }, INPUT_PAUSE_MILLISECONDS);
        }
      }
    },
    [updateMode],
  );

  const inputValue =
    !standardFilterModes.includes(mode) || inputTime > 0 ? mode : "";

  return (
    <Tooltip
      title={
        <div
          className="
            flex flex-col flex-wrap gap-3 p-3 border border-gray-200
            rounded max-w-full
          "
        >
          <div className="flex flex-wrap">
            <OptionButton
              tagId={tagId}
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
              tagId={tagId}
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
              tagId={tagId}
              name="Default"
              active={mode === "Default" || mode === 0}
              description={
                <Type style="bodySmall">
                  This topic will have default filtering and sorting.
                </Type>
              }
            />
            <OptionButton
              tagId={tagId}
              name="Subscribed"
              active={mode === "Subscribed" || mode === subscribePower}
              description={
                <Type style="bodySmall">
                  <em>+{subscribePower}.</em> These posts will be shown more often
                  (as though their score were {subscribePower} points higher).
                </Type>
              }
            />
            <div className="px-[2px]">
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
                  value={inputValue}
                  onChange={onCustomInput}
                  type="number"
                  placeholder="Other"
                  className={clsx(
                    "w-[56px] outline-none placeholder:text-gray-600",
                    typeStyles.bodySmall,
                  )}
                />
              </Tooltip>
            </div>
            <div className="grow" />
            {tagId && <OptionButton tagId={tagId} name="Remove" />}
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

const TagFilterButton: FC<
  FilterTag & {
    tag: TagBase | null;
  }
> = ({ tag, tagId, tagName, filterMode }) => {
  if (filterMode === "TagDefault") {
    filterMode = defaultVisibilityTagById(tagId)?.filterMode ?? "Default";
  }
  const url = tag ? tagGetPageUrl({ tag }) : "#";
  return (
    <FilterButton
      tagId={tagId}
      name={
        <>
          {tagName} <FilterModeIcon filterMode={filterMode} />
        </>
      }
      mode={filterMode}
      description={
        tag ? (
          <div>
            <TagBody html={tag.description} isExcerpt className="mb-3" />
            <Type style="bodyHeavy">
              <Link href={url} className="text-primary hover:opacity-70">
                View all {tag.postCount} posts
              </Link>
            </Type>
          </div>
        ) : (
          <Loading />
        )
      }
    />
  );
};

export default function FilterSettingsEditor({
  className,
}: Readonly<{
  className?: string;
}>) {
  const [tags, setTags] = useState<Record<string, TagBase>>({});
  const { showFilterSettings, filterSettings, addFilterTag } = useFilterSettings();

  const tagIdsToFetch = useMemo(
    () =>
      filterSettings.tags
        .map(({ tagId }) => tagId)
        .filter((tagId) => !(tagId in tags))
        .sort(),
    [tags, filterSettings],
  );

  useEffect(() => {
    void (async () => {
      if (showFilterSettings && tagIdsToFetch.length) {
        const tags = await rpc.tags.listByIds({ tagIds: tagIdsToFetch });
        setTags((previousTags) => ({ ...previousTags, ...tags }));
      }
    })();
  }, [showFilterSettings, tagIdsToFetch]);

  const onSelectTag = useCallback(
    ({ _id, name }: { _id: string; name: string }) => addFilterTag(_id, name),
    [addFilterTag],
  );

  if (!showFilterSettings) {
    return null;
  }

  return (
    <div
      data-component="FilterSettingsEditor"
      className={clsx("flex items-center gap-1 flex-wrap", className)}
    >
      {filterSettings.tags?.map((filterTag) => (
        <TagFilterButton
          key={filterTag.tagId}
          tag={tags[filterTag.tagId] ?? null}
          {...filterTag}
        />
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
      <TagSelect placement="bottom-end" onSelect={onSelectTag}>
        <Tooltip title={<Type style="bodySmall">Add topic filter</Type>}>
          <Button secondary>+</Button>
        </Tooltip>
      </TagSelect>
    </div>
  );
}
