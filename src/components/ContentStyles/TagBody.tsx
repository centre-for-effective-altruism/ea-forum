import { isServer } from "@/lib/environment";
import { load as cheerioLoad } from "cheerio";
import clsx from "clsx";
import "./content-base.css";
import "./tag-body.css";

export default function TagBody({
  html,
  isExcerpt,
  className,
}: Readonly<{
  html: string;
  isExcerpt?: boolean;
  className?: string;
}>) {
  if (isServer && isExcerpt) {
    // Fix hydration errors from malformed HTML in excerpts created with substring
    html = cheerioLoad(html, null, false).html();
  }
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className={clsx("content-base tag-body", className)}
      data-component="TagBody"
    />
  );
}
