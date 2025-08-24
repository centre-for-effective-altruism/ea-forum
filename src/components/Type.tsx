import type { ElementType, ReactNode } from "react";

const styles = {
  body: "font-sans text-[14px] font-[450]",
  bodyMedium: "font-sans text-[14px] font-[500]",
  bodySmall: "font-sans text-[13px] font-[450]",
  postTitle: "font-sans text-[16px] font-[600]",
  commentsHeader: "font-sans text-[24px] leading-[36px] font-[600]",
  sectionTitleLarge: "font-sans text-[20px] font-[700] leading-[25px]",
  sectionTitleSmall:
    "font-sans text-[13px] font-[700] leading-[16px] uppercase text-gray-600",
  logo: "font-sans text-[19px] font-[400]",
  postsPageTitle: "font-serif text-[42px] font-[400] leading-[125%]",
} as const satisfies Record<string, string>;

export type TextStyle = keyof typeof styles;

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
