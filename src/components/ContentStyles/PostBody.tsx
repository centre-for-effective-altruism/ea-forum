import type { ReactNode } from "react";
import { isServer } from "@/lib/environment";
import { load as cheerioLoad } from "cheerio";
import clsx from "clsx";
import "./post-body.css";

type PostBodyContent =
  | {
      html: string;
      isExcerpt?: boolean;
      children?: never;
    }
  | {
      html?: never;
      isExcerpt?: never;
      children: ReactNode;
    };

export default function PostBody({
  html,
  isExcerpt,
  children,
  className,
}: Readonly<
  PostBodyContent & {
    className?: string;
  }
>) {
  const styledClassName = clsx("post-body", className);
  if (html) {
    if (isServer && isExcerpt) {
      // Fix hydration errors from malformed HTML in excerpts created with substring
      html = cheerioLoad(html, null, false).html();
    }
    return (
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className={styledClassName}
        data-component="PostBody"
      />
    );
  }
  return (
    <div className={styledClassName} data-component="PostBody">
      {children}
    </div>
  );
}
