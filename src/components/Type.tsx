import type { ElementType, ReactNode } from "react";

const styles = {
  body: "font-sans text-sm font-[450]",
  bodySmall: "font-sans text-xs font-[450]",
} as const satisfies Record<string, string>;

type TextStyle = keyof typeof styles;

export default function Type({
  style = "body",
  As = "div",
  className = "",
  children,
}: Readonly<{
  style?: TextStyle,
  As?: ElementType
  className?: string,
  children: ReactNode,
}>) {
  return (
    <As className={`${styles[style]} ${className}`} data-component="Type">
      {children}
    </As>
  );
}
