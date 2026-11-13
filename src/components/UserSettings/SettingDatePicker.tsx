"use client";

import { useRef, useState } from "react";
import DatePicker from "../Forms/DatePicker";

export default function SettingDatePicker({
  value,
  onCommit,
  label,
}: Readonly<{
  value: Date | null;
  onCommit: (value: Date | null) => void;
  label: string;
}>) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  const updateDraft = (date: Date | null) => {
    draftRef.current = date;
    setDraft(date);
  };

  const commit = (date: Date | null) => {
    if (date?.getTime() !== value?.getTime()) {
      onCommit(date);
    }
  };

  return (
    <DatePicker
      label={label}
      value={draft}
      setValue={(date) => {
        updateDraft(date);
        if (!date) {
          commit(null);
        }
      }}
      onCalendarClose={() => commit(draftRef.current)}
      clearable
      showTimeInput
      dateFormat="Pp"
    />
  );
}
