import type { ReactNode } from "react";
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
  const classes = clsx("content-base comment-body", className);
  if (html) {
    return (
      <div
        data-component="CommentBody"
        dangerouslySetInnerHTML={{ __html: html }}
        className={classes}
      />
    );
  }
  if (children) {
    return (
      <div data-component="CommentBody" className={classes}>
        {children}
      </div>
    );
  }
  return null;
}
