"use client";

import { ChangeEvent, RefObject, useCallback } from "react";
import Type from "../Type";

export default function PlaintextEditor({
  editorType,
  markdownImgErrors,
  data,
  onFocus,
  placeholder,
  setContents,
  textareaRef,
}: Readonly<{
  editorType: "html" | "markdown";
  markdownImgErrors?: boolean;
  data: string;
  onFocus?: () => void;
  placeholder?: string;
  setContents: (editorType: "html" | "markdown", value: string) => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}>) {
  const onChange = useCallback(
    (ev: ChangeEvent<HTMLTextAreaElement>) => {
      setContents(editorType, ev.target.value);
    },
    [editorType, setContents],
  );

  return (
    <div data-component="PlaintextEditor">
      <textarea
        ref={textareaRef}
        value={data}
        onChange={onChange}
        onFocus={onFocus}
        placeholder={placeholder}
        className="w-full min-h-[130px] field-sizing-content outline-none resize-none"
      />
      {markdownImgErrors && editorType === "markdown" && (
        <Type style="bodySmall" className="text-error my-3">
          Your Markdown contains at least one link to an image served over an
          insecure HTTP connection. You should update all links to images so that
          they are served over a secure HTTPS connection (i.e. the links should start
          with <em>https://</em>).
        </Type>
      )}
    </div>
  );
}
