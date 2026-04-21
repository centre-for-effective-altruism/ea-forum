import type { RefObject, KeyboardEvent } from "react";
import type { EditorAPI, EditorContents } from "@/lib/ckeditor/editorHelpers";
import clsx from "clsx";
import Editor, { EditorOnChangeProps } from "../Editor/Editor";
import Button from "../Button";

export default function CommentForm({
  formType,
  placeholder,
  contents,
  editorRef,
  loading,
  onSubmit,
  onKeyDown,
  onChange,
  className,
}: Readonly<{
  formType: "edit" | "new";
  placeholder: string;
  contents: EditorContents;
  editorRef: RefObject<EditorAPI | null>;
  loading?: boolean;
  onSubmit: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLFormElement>) => void;
  onChange: (props: EditorOnChangeProps) => void;
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
        commentStyles
        commentEditor
        hideControls
        ref={editorRef}
        className="w-full grow"
      />
      <Button type="submit" loading={loading}>
        Comment
      </Button>
    </form>
  );
}
