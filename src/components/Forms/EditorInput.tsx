"use client";

import { useCallback, useId } from "react";
import type { EditorContents } from "@/lib/ckeditor/editorHelpers";
import Editor, { EditorOnChangeProps } from "../Editor/Editor";
import Label from "./Label";
import { EditorCollectionName } from "@/lib/ckeditor/editorSettings";

export default function EditorInput({
  value,
  setValue,
  collectionName,
  placeholder,
  fieldName,
  label,
}: Readonly<{
  value: EditorContents;
  setValue: (value: EditorContents) => void;
  collectionName: EditorCollectionName;
  placeholder?: string;
  fieldName: string;
  label?: string;
}>) {
  const id = useId();
  const onChange = useCallback(
    ({ contents }: EditorOnChangeProps) => {
      setValue(contents);
    },
    [setValue],
  );
  return (
    <div data-component="EditorInput">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Editor
        id={id}
        formType="edit"
        collectionName={collectionName}
        fieldName={fieldName}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        commentStyles
        commentEditor
        hideControls
        className="
          w-full bg-gray-0
          [&_.ck.ck-content]:min-h-[100px]
          [&_.ck.ck-content]:px-1!
          [&_.ck.ck-content]:ml-0!
          [&_.ck.ck-content]:border-b-2!
          [&_.ck.ck-content]:border-b-gray-400!
          [&_.ck.ck-content.ck-focused]:border-b-primary!
        "
      />
    </div>
  );
}
