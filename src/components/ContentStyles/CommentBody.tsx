import type { ReactNode } from "react";

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
  const classes = `font-sans text-[14px] font-[450] cursor-default ${className}`;
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
