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
  children,
  className,
}: Readonly<
  PostBodyContent & {
    className?: string;
  }
>) {
  const styledClassName = clsx("content-base", className);
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
