"use client";

import { ChangeEvent, useCallback, useId } from "react";
import clsx from "clsx";
import Label from "./Label";

export default function ColorInput({
  value,
  setValue,
  label,
  disabled,
  className,
}: Readonly<{
  value: string;
  setValue: (value: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}>) {
  const id = useId();
  const onChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      setValue(ev.target.value);
    },
    [setValue],
  );
  return (
    <div data-component="ColorInput" className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={clsx(
            "h-9 w-12 cursor-pointer rounded border border-gray-300 bg-gray-0 p-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        <span className="font-sans text-sm text-gray-900">{value}</span>
      </div>
    </div>
  );
}
