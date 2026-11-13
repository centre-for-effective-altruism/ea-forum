"use client";

import { KeyboardEvent, useState } from "react";
import Input from "../Forms/Input";

export default function SettingTextInput({
  value,
  onCommit,
  label,
  placeholder,
  multiline,
  disabled,
}: Readonly<{
  value: string;
  onCommit: (value: string) => void;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
}>) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  const commit = () => {
    if (draft === value) {
      return;
    }
    onCommit(draft);
    setDraft(value);
  };

  const onKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === "Enter" && !multiline) {
      ev.preventDefault();
      commit();
    } else if (ev.key === "Escape") {
      setDraft(value);
    }
  };

  return (
    <div onBlur={commit} onKeyDown={onKeyDown}>
      <Input
        value={draft}
        setValue={setDraft}
        label={label}
        placeholder={placeholder}
        multiline={multiline}
        disabled={disabled}
      />
    </div>
  );
}
