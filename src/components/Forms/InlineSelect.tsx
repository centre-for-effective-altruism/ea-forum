"use client";

import { useCallback, useRef } from "react";
import DropdownMenu from "../Dropdown/DropdownMenu";
import Type from "../Type";

type Option<T extends string> = {
  label: string;
  value: T;
};

type InlineSelectProps<T extends string> = {
  value: T;
  setValue: (value: T) => void;
  options: Option<T>[];
  placeholder?: string;
  className?: string;
};

export default function InlineSelect<T extends string>({
  value,
  setValue,
  options,
}: Readonly<InlineSelectProps<T>>) {
  const dismissRef = useRef<(() => void) | null>(null);
  const onSelect = useCallback(
    (newValue: T) => {
      setValue(newValue);
      dismissRef.current?.();
    },
    [setValue],
  );
  const selectedOption = options.find((option) => option.value === value);
  return (
    <DropdownMenu
      dismissRef={dismissRef}
      placement="bottom-start"
      items={options.map((option) => (
        <Type
          key={option.value}
          onClick={() => onSelect(option.value)}
          style="bodyMedium"
          As="button"
          className="
            cursor-pointer block w-full text-left px-2 py-[6px] rounded
            text-gray-1000 hover:bg-gray-300
          "
        >
          {option.label}
        </Type>
      ))}
    >
      <Type
        As="span"
        style="bodyHeavy"
        className="
          user-select-none text-primary cursor-pointer hover:text-primary-dark
        "
      >
        {selectedOption?.label ?? "Select an option"}
      </Type>
    </DropdownMenu>
  );
}
