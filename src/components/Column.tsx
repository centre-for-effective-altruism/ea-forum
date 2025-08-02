import type { ElementType, ReactNode } from "react";

export default function Column({As = "div", className, children}: Readonly<{
  As?: ElementType
  className?: string,
  children: ReactNode,
}>) {
  return (
    <As
      className={`max-w-[1500px] mx-auto my-0 ${className}`}
      data-component="Column"
    >
      {children}
    </As>
  );
}
