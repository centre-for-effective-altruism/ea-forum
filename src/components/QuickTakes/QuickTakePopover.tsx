"use client";

import { useNewQuickTake } from "./useNewQuickTake";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import QuickTakeTags from "./QuickTakeTags";
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
  const {
    tagProps,
    editorProps: { loading, editorRef, contents, onSubmit, onKeyDown, onChange },
  } = useNewQuickTake({ onSuccess: onClose });
  return (
    <Popover open={open} onClose={onClose} noPadding>
      <div data-component="QuickTakePopover" className="w-[750px] max-w-full">
        <div className="flex justify-between items-center mx-8 mt-6 mb-4">
          <Type style="sectionTitleLarge">New quick take</Type>
          <button onClick={onClose} className="cursor-pointer">
            <XMarkIcon className="w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} onKeyDown={onKeyDown} className="w-full">
          <div className="flex flex-col gap-1 [&_.ck.ck-content]:min-h-[100px] w-full">
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
              className="w-full grow px-8"
            />
            <QuickTakeTags {...tagProps} className="px-8" />
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
