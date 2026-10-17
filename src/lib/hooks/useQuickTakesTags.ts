import { useCallback, useState } from "react";
import { filterNonNull } from "../typeHelpers";
import type { TagBase } from "../tags/tagQueries";

const FRONTPAGE_TAG_ID = "frontpage" as const;
const FRONTPAGE_DUMMY_TAG = {
  _id: FRONTPAGE_TAG_ID,
  name: "Frontpage",
  shortName: null,
} as const;

type QuickTakesTag = TagBase | typeof FRONTPAGE_DUMMY_TAG;

// TODO: This should include the tag for the current forum event after the
// frontpage dummy tag
export const useQuickTakesTags = (
  coreTags: TagBase[],
  initialSelectedTagIds: string[] = [],
) => {
  const [frontpage, setFrontpage] = useState(true);
  const [selectedTagIds, setSelectedTagIds] =
    useState<string[]>(initialSelectedTagIds);

  const tags: QuickTakesTag[] = [FRONTPAGE_DUMMY_TAG, ...coreTags];

  const onTagSelected = useCallback((tag: QuickTakesTag) => {
    if (tag._id === FRONTPAGE_TAG_ID) {
      setFrontpage(true);
    } else {
      setSelectedTagIds((existingTagIds) =>
        filterNonNull(
          Array.from(
            new Set([
              ...existingTagIds.filter((id) => id !== FRONTPAGE_TAG_ID),
              tag._id,
            ]),
          ),
        ),
      );
    }
  }, []);

  const onTagRemoved = useCallback((tag: QuickTakesTag) => {
    if (tag._id === FRONTPAGE_TAG_ID) {
      setFrontpage(false);
    } else {
      setSelectedTagIds((existingTagIds) =>
        existingTagIds.filter((id) => id !== tag._id && id !== FRONTPAGE_TAG_ID),
      );
    }
  }, []);

  return {
    frontpage,
    selectedTagIds,
    tags: tags ?? [],
    frontpageTagId: FRONTPAGE_TAG_ID,
    onTagSelected,
    onTagRemoved,
  };
};

export type QuickTakesTagsProps = ReturnType<typeof useQuickTakesTags>;
