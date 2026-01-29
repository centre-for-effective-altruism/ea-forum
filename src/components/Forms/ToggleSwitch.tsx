"use client";

import { ElementType, useCallback } from "react";
import clsx from "clsx";

export default function ToggleSwitch({
  value,
  onChange,
  As = "button",
}: Readonly<{
  value: boolean;
  onChange?: (value: boolean) => void;
  As?: ElementType;
}>) {
  const onClick = useCallback(() => {
    onChange?.(!value);
  }, [value, onChange]);
  return (
    <As
      type="button"
      role="switch"
      aria-checked={value}
      onClick={onClick}
      className={clsx(
        "relative w-[28px] min-w-[28px] h-[16px] rounded-full",
        "cursor-pointer transition-colors",
        value ? "bg-primary" : "bg-gray-400",
      )}
    >
      <div
        className={clsx(
          "absolute top-[2px] w-[12px] h-[12px] rounded-full bg-white transition-all",
          value ? "left-[14px]" : "left-[2px]",
        )}
      />
    </As>
  );
}
