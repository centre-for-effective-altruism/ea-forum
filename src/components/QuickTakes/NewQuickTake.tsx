"use client";

import { useCallback, useState } from "react";
import { useNewQuickTake } from "./useNewQuickTake";
import { useQuickTakesListContext } from "./QuickTakesListContext";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { TagBase } from "@/lib/tags/tagQueries";
import QuickTakeTags from "./QuickTakeTags";
import Editor from "../Editor/Editor";
import Button from "../Button";
import clsx from "clsx";

export default function NewQuickTake({
  coreTags,
  className,
}: Readonly<{
  coreTags: TagBase[];
  className?: string;
}>) {
  const [open, setOpen] = useState(false);
  const { addLocalQuickTake } = useQuickTakesListContext();
  const onSuccess = useCallback(
    (quickTake: CommentListItem) => addLocalQuickTake(quickTake),
    [addLocalQuickTake],
  );
  const {
    tagProps,
    editorProps: { loading, editorRef, contents, onSubmit, onKeyDown, onChange },
  } = useNewQuickTake({ coreTags, onSuccess });

  const onFocus = useCallback(() => setOpen(true), []);
  const onCancel = useCallback(() => setOpen(false), []);

  return (
    <form
      data-component="NewQuickTake"
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      className={clsx("bg-gray-0 border border-gray-200 p-3 rounded", className)}
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
      {open && <QuickTakeTags {...tagProps} />}
    </form>
  );
}
