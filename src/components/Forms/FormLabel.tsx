import type { ReactNode } from "react";
import clsx from "clsx";

export default function FormLabel({
  required,
  disabled,
  className,
  children,
}: {
  required?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      data-component="FormLabel"
      className={clsx(
        "font-sans text-[16px] font-[450] text-gray-600 focus:text-primary-dark",
        disabled && "opacity-70",
        className,
      )}
    >
      {children}
      {required && <span>{"\u2009*"}</span>}
    </label>
  );
}
