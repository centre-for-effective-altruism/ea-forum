"use client";

import { ChangeEvent, RefObject, useCallback } from "react";

export default function PlaintextEditor({
  editorType,
  data,
  onFocus,
  placeholder,
  setContents,
  textareaRef,
}: Readonly<{
  editorType: "html" | "markdown";
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
    </div>
  );
}
