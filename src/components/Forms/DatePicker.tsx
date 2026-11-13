"use client";

import { useCallback, useId } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Label from "./Label";
import clsx from "clsx";

type DatePickerValue =
  | {
      value: Date;
      setValue: (date: Date) => void;
      clearable?: false;
    }
  | {
      value: Date | null;
      setValue: (date: Date | null) => void;
      clearable: true;
    };

export default function DatePicker({
  value,
  setValue,
  clearable,
  label,
  disabled,
  dateFormat,
  showTimeInput,
  shouldCloseOnSelect,
  onCalendarOpen,
  onCalendarClose,
  onClear,
  onClearMouseDown,
  onBlur,
  className,
}: Readonly<
  {
    label?: string;
    disabled?: boolean;
    dateFormat?: string;
    showTimeInput?: boolean;
    shouldCloseOnSelect?: boolean;
    onCalendarOpen?: () => void;
    onCalendarClose?: () => void;
    /** Called when the clear button is clicked, after setValue(null) */
    onClear?: () => void;
    /**
     * Called when the mouse is pressed on the clear button. This happens before
     * the press closes an open calendar, whereas onClear fires after it.
     */
    onClearMouseDown?: () => void;
    onBlur?: () => void;
    className?: string;
  } & DatePickerValue
>) {
  const id = useId();
  const onChange = useCallback(
    (date: Date | null, event?: { type: string }) => {
      if (!clearable && !date) {
        throw new Error("Missing date value");
      }
      setValue(date!);
      if (!date && event?.type === "click") {
        onClear?.();
      }
    },
    [setValue, clearable, onClear],
  );
  return (
    <div
      data-component="DatePicker"
      className={clsx("w-full [&>div]:w-full", className)}
      onMouseDownCapture={(ev) => {
        if (
          ev.target instanceof Element &&
          ev.target.closest(".react-datepicker__close-icon")
        ) {
          onClearMouseDown?.();
        }
      }}
    >
      {label && (
        <Label htmlFor={id} className="mb-0!">
          {label}
        </Label>
      )}
      <ReactDatePicker
        id={id}
        selected={value}
        onChange={onChange}
        isClearable={clearable}
        disabled={disabled}
        dateFormat={dateFormat}
        showTimeInput={showTimeInput}
        shouldCloseOnSelect={shouldCloseOnSelect}
        onCalendarOpen={onCalendarOpen}
        onCalendarClose={onCalendarClose}
        onBlur={onBlur}
        className="
          px-1 py-2 outline-none bg-gray-0 border-b-2 border-gray-400 w-full
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          focus:border-primary font-sans font-[400] text-sm
        "
      />
    </div>
  );
}
