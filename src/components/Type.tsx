import type { ElementType, ReactNode } from "react";

const styles = {
  body: "font-sans text-[14px] font-[450]",
  bodySmall: "font-sans text-[13px] font-[450]",
  postTitle: "font-sans text-[16px] font-[600]",
  sectionTitleLarge: "font-sans text-[20px] font-[700] leading-[25px]",
  sectionTitleSmall:
    "font-sans text-[13px] font-[700] leading-[16px] uppercase text-gray-600",
} as const satisfies Record<string, string>;

type TextStyle = keyof typeof styles;

export default function Type({
  style = "body",
  As = "div",
  className = "",
  children,
}: Readonly<{
  style?: TextStyle;
  As?: ElementType;
  className?: string;
  children: ReactNode;
}>) {
  return (
    <As className={`${styles[style]} ${className}`} data-component="Type">
      {children}
    </As>
  );
}
