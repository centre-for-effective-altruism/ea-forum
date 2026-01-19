import type { ReactNode } from "react";
import clsx from "clsx";

export default function Label({
  htmlFor,
  children,
  className,
}: Readonly<{
  htmlFor: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <label
      data-component="Label"
      htmlFor={htmlFor}
      className={clsx(
        "block text-[12px] font-[400] text-primary mb-[-2px]",
        className,
      )}
    >
      {children}
    </label>
  );
}
