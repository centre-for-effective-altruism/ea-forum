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
  showTimeSelect,
  className,
}: Readonly<
  {
    label?: string;
    disabled?: boolean;
    /** Also allow picking a time of day (in 15 minute increments) */
    showTimeSelect?: boolean;
    className?: string;
  } & DatePickerValue
>) {
  const id = useId();
  const onChange = useCallback(
    (date: Date | null) => {
      if (!clearable && !date) {
        throw new Error("Missing date value");
      }
      setValue(date!);
    },
    [setValue, clearable],
  );
  return (
    <div
      data-component="DatePicker"
      className={clsx("w-full [&>div]:w-full", className)}
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
        showTimeSelect={showTimeSelect}
        timeIntervals={15}
        dateFormat={showTimeSelect ? "MMM d, yyyy h:mm aa" : undefined}
        className="
          px-1 py-2 outline-none bg-gray-0 border-b-2 border-gray-400 w-full
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          focus:border-primary font-sans font-[400] text-sm
        "
      />
    </div>
  );
}
