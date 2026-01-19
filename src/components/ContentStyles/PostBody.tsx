import type { ReactNode } from "react";
import clsx from "clsx";
import "./post-body.css";

export default function PostBody({
  html,
  children,
  className,
}: Readonly<{
  html?: string | null;
  children?: ReactNode;
  className?: string;
}>) {
  if (!html) {
    return null;
  }
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className={clsx("post-body", className)}
      data-component="PostBody"
    >
      {children}
    </div>
  );
}
