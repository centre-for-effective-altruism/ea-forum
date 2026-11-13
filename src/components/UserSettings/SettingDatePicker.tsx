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
  const calendarOpenRef = useRef(false);
  const [lastValue, setLastValue] = useState(value);

  const updateDraft = (date: Date | null) => {
    draftRef.current = date;
    setDraft(date);
  };

  if (value?.getTime() !== lastValue?.getTime()) {
    setLastValue(value);
    draftRef.current = value;
    setDraft(value);
  }

  const commit = (date: Date | null) => {
    if (date?.getTime() !== value?.getTime()) {
      onCommit(date);
      updateDraft(value);
    }
  };

  return (
    <DatePicker
      label={label}
      value={draft}
      setValue={updateDraft}
      onClear={() => commit(null)}
      onBlur={() => {
        if (!calendarOpenRef.current) {
          commit(draftRef.current);
        }
      }}
      onCalendarOpen={() => {
        calendarOpenRef.current = true;
      }}
      onCalendarClose={() => {
        calendarOpenRef.current = false;
        commit(draftRef.current);
      }}
      clearable
      showTimeInput
      dateFormat="Pp"
    />
  );
}
