"use client";

import { useCallback } from "react";
import { useCommentEditor } from "@/lib/hooks/useCommentEditor";
import toast from "react-hot-toast";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import Editor from "../Editor/Editor";
import Popover from "../Popover";
import Button from "../Button";
import Type from "../Type";

export default function QuickTakePopover({
  open,
  onClose,
}: Readonly<{
  open: boolean;
  onClose: () => void;
}>) {
  const onSuccess = useCallback(() => {
    toast.success("Quick take published");
    onClose();
  }, [onClose]);
  const { loading, editorRef, contents, onSubmit, onKeyDown, onChange } =
    useCommentEditor({
      shortform: true,
      onSuccess,
    });
  return (
    <Popover open={open} onClose={onClose} noPadding>
      <div data-component="QuickTakePopover" className="w-[750px] max-w-full">
        <div className="flex justify-between items-center mx-8 mt-6 mb-4">
          <Type style="sectionTitleLarge">New quick take</Type>
          <button onClick={onClose} className="cursor-pointer">
            <XMarkIcon className="w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} onKeyDown={onKeyDown}>
          <div className="flex flex-col gap-1 [&_.ck.ck-content]:min-h-[100px]">
            <Editor
              formType="new"
              collectionName="Comments"
              fieldName="contents"
              placeholder="Share exploratory, draft-stage, rough thoughts..."
              value={contents}
              onChange={onChange}
              commentStyles
              commentEditor
              hideControls
              ref={editorRef}
              className="w-full grow mx-8"
            />
            {/* TODO: Add topics to quick takes */}
            <hr className="border-t-gray-200 my-4" />
            <div className="flex items-center justify-end gap-2 mx-8 mb-6">
              <Button variant="greyFilled" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Publish
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Popover>
  );
}
