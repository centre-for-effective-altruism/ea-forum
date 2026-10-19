"use client";

import { ElementType, useCallback } from "react";
import clsx from "clsx";

export default function ToggleSwitch({
  value,
  setValue,
  id,
  As = "button",
  className,
}: Readonly<{
  value: boolean;
  setValue?: (value: boolean) => void;
  id?: string;
  As?: ElementType;
  className?: string;
}>) {
  const onClick = useCallback(() => setValue?.(!value), [value, setValue]);
  return (
    <As
      id={id}
      type="button"
      role="switch"
      aria-checked={value}
      onClick={onClick}
      className={clsx(
        "relative w-[28px] min-w-[28px] h-[16px] rounded-full",
        "cursor-pointer transition-colors",
        value ? "bg-primary" : "bg-gray-400",
        className,
      )}
    >
      <div
        className={clsx(
          "absolute top-[2px] w-3 h-3 rounded-full bg-always-white transition-all",
          value ? "left-[14px]" : "left-[2px]",
        )}
      />
    </As>
  );
}
