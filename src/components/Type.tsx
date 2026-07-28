import type { CSSProperties, ElementType, MouseEvent, ReactNode, Ref } from "react";

export const typeStyles = {
  body: "font-sans text-[14px] font-[450]",
  bodyMedium: "font-sans text-[14px] font-[500]",
  bodyHeavy: "font-sans text-[14px] font-[600]",
  bodyXHeavy: "font-sans text-[14px] font-[700]",
  bodySmall: "font-sans text-[13px] font-[450]",
  bodySmallMedium: "font-sans text-[13px] font-[500]",
  bodyXSmall: "font-sans text-[12px] font-[500]",
  bodyXXSmall: "font-sans text-[11px] font-[450]",
  bodyLarge: "font-sans text-[16px] font-[500]",
  bodySerif:
    "font-serif text-[19px] font-[430] tracking-tight [&_em]:tracking-[0.02em] [&_i]:tracking-[0.02em]",
  postTitle: "font-sans text-[16px] font-[600]",
  voteScore: "font-sans text-[16px] font-[500]",
  homePageTab: "font-sans text-[24px] font-[700] leading-[24px] tracking-[-0.5px]",
  pollQuestion: "font-sans text-[24px] font-[700] leading-[28px]",
  commentsHeader: "font-sans text-[24px] leading-[36px] font-[600]",
  sectionTitleLarge: "font-sans text-[20px] font-[700] leading-[25px]",
  sectionTitleSmall:
    "font-sans text-[13px] font-[700] leading-[16px] uppercase text-gray-600",
  spotlightTitle: "font-sans text-[22px] font-[600]",
  logo: "font-sans text-[19px] font-[400] tracking-[-0.015em]",
  postsPageTitle:
    "font-sans font-[700] text-[34px] leading-[1.15] sm:text-[40px] sm:leading-[125%]",
  directoryCell: "font-sans text-[13px] font-[500] leading-[1.4rem]",
  postDescription: "font-sans text-[13px] font-[500]",
  loadMore: "font-sans text-[14px] font-[550]",
  userProfileName: "font-sans text-[30px] font-[600]",
  onboardingTitle: "font-sans text-[30px] font-[600] tracking-[-0.6px]",
  onboardingTag: "font-sans text-[13px] font-[700] leading-[16px]",
  featuredPostTitle:
    "font-sans font-[600] text-[22px] leading-[120%] tracking-[-0.6px]",
  featuredPostTitleLarge:
    "font-sans font-[600] text-[22px] leading-[120%] tracking-[0.44px] xl:text-[32px] xl:leading-[110%] xl:tracking-[0.64px]",
} as const satisfies Record<string, string>;

export type TextStyle = keyof typeof typeStyles;

export default function Type({
  style = "body",
  As = "div",
  className = "",
  cssStyle,
  innerRef,
  children,
  ...rest
}: Readonly<{
  style?: TextStyle;
  As?: ElementType;
  id?: string;
  role?: string;
  disabled?: boolean;
  onClick?: (ev: MouseEvent) => void;
  cssStyle?: CSSProperties;
  innerRef?: Ref<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}>) {
  return (
    <As
      {...rest}
      ref={innerRef}
      style={cssStyle}
      className={`${typeStyles[style]} ${className}`}
      data-component="Type"
      data-style={style}
    >
      {children}
    </As>
  );
}
