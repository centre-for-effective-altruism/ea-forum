"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import type { CommentTag, TagBase } from "@/lib/tags/tagQueries";
import type { DropdownDismissRef } from "../Dropdown/Dropdown";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { userIsAdminOrMod } from "@/lib/users/userHelpers";
import { rpc } from "@/lib/rpc";
import sortBy from "lodash/sortBy";
import toast from "react-hot-toast";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import TagSelect from "../Tags/TagSelect";
import TagChip from "../Tags/TagChip";
import TextLinkButton from "../TextLinkButton";
import Type from "../Type";

const INITIAL_SUBTAGS_COUNT = 7;

export default function TopicSubtagsSidebar({
  tag,
  subTags,
}: Readonly<{
  tag: CommentTag & { _id: string };
  subTags: TagBase[];
}>) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const dismissRef: DropdownDismissRef = useRef(null);
  const [showAll, setShowAll] = useState(false);
  const [pending, setPending] = useState(false);
  const canEdit = userIsAdminOrMod(currentUser);

  const setParentTag = useCallback(
    async (tagId: string, parentTagId: string | null) => {
      dismissRef.current?.();
      setPending(true);
      try {
        await rpc.tags.setParentTag({ tagId, parentTagId });
        router.refresh();
      } catch (e) {
        console.error(e);
        toast.error((e as Error).message || "Something went wrong");
        captureException(e);
      }
      setPending(false);
    },
    [router],
  );

  const onAdd = useCallback(
    (subTag: { _id: string }) => setParentTag(subTag._id, tag._id),
    [setParentTag, tag._id],
  );

  if (!canEdit && !subTags.length) {
    return null;
  }

  const sortedSubTags = sortBy(subTags, [(subTag) => !subTag.core, "name"]);
  const visibleSubTags = showAll
    ? sortedSubTags
    : sortedSubTags.slice(0, INITIAL_SUBTAGS_COUNT);

  return (
    <section
      data-component="TopicSubtagsSidebar"
      className="bg-postitem rounded p-4 flex flex-col gap-3"
    >
      <Type style="sectionTitleSmall">Posts in this topic are about</Type>
      <div className="flex flex-wrap items-center gap-1">
        <TagChip tag={tag} />
        {visibleSubTags.map((subTag) => (
          <div key={subTag._id} className="flex items-center">
            <TagChip tag={subTag} />
            {canEdit && (
              <button
                onClick={setParentTag.bind(null, subTag._id, null)}
                disabled={pending}
                aria-label={`Remove ${subTag.name}`}
                title={`Remove ${subTag.name}`}
                className="
                  cursor-pointer p-1 text-gray-600 hover:text-gray-1000
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                <XMarkIcon className="w-3" />
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <TagSelect
            placement="bottom-start"
            onSelect={onAdd}
            dismissRef={dismissRef}
          >
            <TextLinkButton disabled={pending} className="px-2 py-1">
              + Add sub-topic
            </TextLinkButton>
          </TagSelect>
        )}
      </div>
      {!showAll && visibleSubTags.length < sortedSubTags.length && (
        <TextLinkButton onClick={setShowAll.bind(null, true)} className="self-start">
          Show all
        </TextLinkButton>
      )}
    </section>
  );
}
