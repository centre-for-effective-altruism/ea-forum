"use client";

import { SubmitEvent, useCallback, useState } from "react";
import { useCommentEditor } from "@/lib/hooks/useCommentEditor";
import { useQuickTakesTags } from "@/lib/hooks/useQuickTakesTags";
import { useQuickTakesListContext } from "./QuickTakesListContext";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { TagBase } from "@/lib/tags/tagQueries";
import toast from "react-hot-toast";
import clsx from "clsx";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import TruncationContainer from "../TruncationContainer";
import Editor from "../Editor/Editor";
import Button from "../Button";
import Type from "../Type";

export default function NewQuickTake({
  coreTags,
  className,
}: Readonly<{
  coreTags: TagBase[];
  className?: string;
}>) {
  const [open, setOpen] = useState(false);
  const { addLocalQuickTake } = useQuickTakesListContext();
  const {
    frontpage,
    frontpageTagId,
    selectedTagIds,
    onTagSelected,
    onTagRemoved,
    tags,
  } = useQuickTakesTags(coreTags);

  const onFocus = useCallback(() => setOpen(true), []);
  const onCancel = useCallback(() => setOpen(false), []);
  const onSuccess = useCallback(
    (quickTake: CommentListItem) => {
      addLocalQuickTake(quickTake);
      toast.success("Quick take published");
    },
    [addLocalQuickTake],
  );

  const { loading, editorRef, contents, onSubmit, onKeyDown, onChange } =
    useCommentEditor({
      shortform: true,
      onSuccess,
    });

  const handleSubmit = useCallback(
    async (ev: SubmitEvent<HTMLFormElement>) => {
      await onSubmit(ev, {
        shortformFrontpage: frontpage,
        relevantTagIds: selectedTagIds,
      });
    },
    [onSubmit, frontpage, selectedTagIds],
  );

  return (
    <form
      data-component="NewQuickTake"
      onSubmit={handleSubmit}
      onKeyDown={onKeyDown}
      className={clsx(
        "bg-comment-even border border-comment-border p-3 rounded",
        className,
      )}
    >
      <div
        className={clsx(
          "flex flex-col gap-1 bg-gray-100 rounded p-2",
          open ? "[&_.ck.ck-content]:min-h-[100px]" : "[&_p]:mb-0!",
        )}
      >
        <Editor
          formType="new"
          collectionName="Comments"
          fieldName="contents"
          placeholder="Share exploratory, draft-stage, rough thoughts..."
          value={contents}
          onChange={onChange}
          onFocus={onFocus}
          commentStyles
          commentEditor
          hideControls
          ref={editorRef}
          className="w-full grow"
        />
        <div
          className={clsx("flex items-center justify-end gap-2", !open && "hidden")}
        >
          <Button variant="greyFilled" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Publish
          </Button>
        </div>
      </div>
      {open && (
        <div className="mt-2 -mb-1 whitespace-nowrap flex items-center">
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
      )}
    </form>
  );
}
