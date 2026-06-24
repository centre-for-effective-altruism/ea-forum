import type { RefObject, KeyboardEvent } from "react";
import type { EditorAPI, EditorContents } from "@/lib/ckeditor/editorHelpers";
import clsx from "clsx";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import Editor, { EditorAutosave, EditorOnChangeProps } from "../Editor/Editor";
import DropdownMenu from "../Dropdown/DropdownMenu";
import Button from "../Button";

export default function CommentForm({
  formType,
  placeholder,
  contents,
  editorRef,
  loading,
  cancelLabel = "Cancel",
  onCancel,
  onSubmit,
  onSaveDraft,
  onKeyDown,
  onChange,
  autosave,
  className,
}: Readonly<{
  formType: "edit" | "new";
  placeholder: string;
  contents: EditorContents;
  editorRef: RefObject<EditorAPI | null>;
  loading?: boolean;
  cancelLabel?: string;
  onCancel?: () => void;
  onSubmit: () => void;
  onSaveDraft: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLFormElement>) => void;
  onChange: (props: EditorOnChangeProps) => void;
  autosave?: EditorAutosave;
  className?: string;
}>) {
  return (
    <form
      data-component="CommentForm"
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      className={clsx(
        "border border-comment-border rounded p-2 [&_.ck.ck-content]:min-h-[100px]",
        "flex flex-col items-end gap-1",
        className,
      )}
    >
      <Editor
        formType={formType}
        collectionName="Comments"
        fieldName="contents"
        placeholder={placeholder}
        value={contents}
        onChange={onChange}
        autosave={autosave}
        commentStyles
        commentEditor
        hideControls
        ref={editorRef}
        className="w-full grow"
      />
      <div className="flex items-center gap-2">
        {onCancel && (
          <Button variant="greyFilled" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
        <div className="flex">
          <Button type="submit" loading={loading} className="rounded-r-none!">
            Comment
          </Button>
          <div aria-hidden className="w-[1px] min-w-[1px] bg-primary">
            <div className="w-full mt-[6px] py-3 bg-always-white opacity-90" />
          </div>
          <DropdownMenu
            placement="bottom-end"
            className="w-[125px]! min-w-[0]!"
            items={[
              {
                title: "Save as draft",
                onClick: onSaveDraft,
              },
            ]}
          >
            <Button className="h-full rounded-l-none! px-1! py-0!">
              <ChevronDownIcon className="w-6" />
            </Button>
          </DropdownMenu>
        </div>
      </div>
    </form>
  );
}
