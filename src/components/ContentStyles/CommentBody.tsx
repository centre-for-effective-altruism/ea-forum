import type { ReactNode } from "react";
import ContentProgressiveEnhancements from "./ContentProgressiveEnhancements";
import clsx from "clsx";
import "./content-base.css";
import "./comment-body.css";

type CommentBodyHTML = {
  html: string | null;
  children?: never;
};

type CommentBodyChildren = {
  html?: never;
  children: ReactNode;
};

type CommentBodyContent = CommentBodyHTML | CommentBodyChildren;

export default function CommentBody({
  html,
  children,
  className = "",
}: Readonly<
  CommentBodyContent & {
    className?: string;
  }
>) {
  const styledClassName = clsx("content-base comment-body", className);
  if (html) {
    return (
      <ContentProgressiveEnhancements html={html} className={styledClassName} />
    );
  }
  if (children) {
    return (
      <div data-component="CommentBody" className={styledClassName}>
        {children}
      </div>
    );
  }
  return null;
}
