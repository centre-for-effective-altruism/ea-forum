import { isServer } from "@/lib/environment";
import { load as cheerioLoad } from "cheerio";

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
  // TODO: This needs styles
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className={className}
      data-component="TagBody"
    />
  );
}
