"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { useSearchPage } from "./useSearchPage";
import { rpc } from "@/lib/rpc";
import MagnifyingGlassIcon from "@heroicons/react/16/solid/MagnifyingGlassIcon";
import XMarkIcon from "@heroicons/react/16/solid/XMarkIcon";
import TagSelect from "../../Tags/TagSelect";
import Type from "../../Type";

type TagNames = Record<string, string | null>;

export default function SearchPageTopicFilter() {
  const { state, updateFilters } = useSearchPage();
  const [tagNames, setTagNames] = useState<TagNames>({});

  const tagIdsToFetch = useMemo(
    () => state.tags.filter((tagId) => !(tagId in tagNames)),
    [state.tags, tagNames],
  );

  useEffect(() => {
    if (!tagIdsToFetch.length) {
      return;
    }
    void (async () => {
      let fetchedTags: Awaited<ReturnType<typeof rpc.tags.listByIds>> = {};
      try {
        fetchedTags = await rpc.tags.listByIds({ tagIds: tagIdsToFetch });
      } catch (e) {
        console.error("Failed to load search topic names:", e);
        captureException(e);
      }
      setTagNames((previousNames) => {
        const names = { ...previousNames };
        for (const tagId of tagIdsToFetch) {
          names[tagId] ??= fetchedTags[tagId]?.name ?? null;
        }
        return names;
      });
    })();
  }, [tagIdsToFetch]);

  const onSelect = useCallback(
    ({ _id, name }: { _id: string; name: string }) => {
      setTagNames((previousNames) => ({ ...previousNames, [_id]: name }));
      if (!state.tags.includes(_id)) {
        updateFilters({ tags: [...state.tags, _id] });
      }
    },
    [state.tags, updateFilters],
  );

  const onRemove = useCallback(
    (tagId: string) => {
      updateFilters({ tags: state.tags.filter((id) => id !== tagId) });
    },
    [state.tags, updateFilters],
  );

  return (
    <section data-component="SearchPageTopicFilter" className="flex flex-col gap-2">
      <TagSelect placement="bottom-start" onSelect={onSelect}>
        <Type
          As="button"
          style="bodySmall"
          className="
            cursor-pointer flex items-center justify-between gap-2 w-[220px] max-w-full
            px-3 py-2 rounded border border-gray-300 text-gray-600
            hover:border-gray-600 hover:text-gray-1000
          "
        >
          Filter by topics
          <MagnifyingGlassIcon className="w-4" />
        </Type>
      </TagSelect>
      {state.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {state.tags.map((tagId) => {
            if (!(tagId in tagNames)) {
              return (
                <div
                  key={tagId}
                  className="h-[28px] w-20 rounded-sm bg-gray-200"
                  aria-hidden
                />
              );
            }
            const name = tagNames[tagId] ?? "Unknown topic";
            return (
              <Type
                key={tagId}
                style="postDescription"
                className="
                  flex items-center gap-1 h-[28px] py-[6px] pl-2 pr-1 whitespace-nowrap
                  rounded-sm border-1 border-gray-300 text-gray-1000
                "
              >
                {name}
                <button
                  type="button"
                  aria-label={`Remove ${name} filter`}
                  onClick={() => onRemove(tagId)}
                  className="
                    cursor-pointer rounded-xs p-[2px] text-gray-600
                    hover:bg-gray-100 hover:text-gray-1000
                  "
                >
                  <XMarkIcon className="w-3" />
                </button>
              </Type>
            );
          })}
        </div>
      )}
    </section>
  );
}
