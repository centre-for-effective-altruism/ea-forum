import { ReactNode } from "react";

export const SCROLL_INDICATOR_SIZE = 13;

export default function HorizScrollBlock({
  children,
  className = "",
  contentsClassName = "",
}: Readonly<{
  children: ReactNode;
  className?: string;
  contentsClassName?: string;
}>) {
  // TODO
  return (
    <div data-component="HorizScrollBlock" className={className}>
      <div className={contentsClassName}>{children}</div>
    </div>
  );
}
