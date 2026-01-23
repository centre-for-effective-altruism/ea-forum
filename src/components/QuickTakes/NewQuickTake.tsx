"use client";

import { useCallback, useState } from "react";
import { useCommentEditor } from "@/lib/hooks/useCommentEditor";
import toast from "react-hot-toast";
import clsx from "clsx";
import Editor from "../Editor/Editor";
import Button from "../Button";

export default function NewQuickTake({
  className,
}: Readonly<{
  className?: string;
}>) {
  const [open, setOpen] = useState(false);
  const onFocus = useCallback(() => setOpen(true), []);
  const onCancel = useCallback(() => setOpen(false), []);
  const onSuccess = useCallback(() => {
    toast.success("Quick take published");
  }, []);
  const { loading, editorRef, contents, onSubmit, onKeyDown, onChange } =
    useCommentEditor({
      shortform: true,
      onSuccess,
    });
  return (
    <form
      data-component="NewQuickTake"
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      className={clsx("bg-gray-50 border border-gray-100 p-3 rounded", className)}
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
    </form>
  );
}
