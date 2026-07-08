import type { ReactNode } from "react";
import ContentProgressiveEnhancements from "./ContentProgressiveEnhancements";
import clsx from "clsx";
import "./content-base.css";

type PostBodyContent =
  | {
      html: string;
      children?: never;
    }
  | {
      html?: never;
      children: ReactNode;
    };

export default function PostBody({
  html,
  smallText,
  children,
  className,
}: Readonly<
  PostBodyContent & {
    smallText?: boolean;
    className?: string;
  }
>) {
  const styledClassName = clsx(
    "content-base",
    smallText &&
      `
      text-[17px] [&_p]:text-[17px] [&_li]:text-[17px] [&_blockquote]:text-[17px]
      [&_h1]:text-[18px]! [&_h2]:text-[17px]! [&_h3]:text-[16px]!
      [&_h4]:text-[16px]! [&_h5]:text-[16px]! [&_h6]:text-[16px]!
    `,
    className,
  );
  if (html) {
    return (
      <ContentProgressiveEnhancements html={html} className={styledClassName} />
    );
  }
  return (
    <div className={styledClassName} data-component="PostBody">
      {children}
    </div>
  );
}
