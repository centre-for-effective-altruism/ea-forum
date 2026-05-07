import type { ReactNode } from "react";
import type { Document } from "domhandler";
import {
  locationHashIsFootnote,
  locationHashIsFootnoteBackreference,
} from "@/lib/utils/contentHelpers";
import FootnotePreview from "./FootnotePreview";
import Link from "../Link";

export default function HoverPreviewLink({
  href,
  id,
  rel,
  document,
  className,
  children,
}: Readonly<{
  href: string;
  id?: string;
  rel?: string;
  document: Document;
  className?: string;
  children: ReactNode;
}>) {
  const defaultLinkNode = (
    <Link href={href} id={id} rel={rel} className={className}>
      {children}
    </Link>
  );

  // Invalid link with no href? Don't transform it.
  if (!href) {
    return defaultLinkNode;
  }

  // Within-page relative link?
  if (href.startsWith("#")) {
    if (locationHashIsFootnote(href)) {
      return (
        <FootnotePreview
          href={href}
          id={id}
          rel={rel}
          document={document}
          className={className}
        >
          {children}
        </FootnotePreview>
      );
    } else if (locationHashIsFootnoteBackreference(href)) {
      return defaultLinkNode;
    }
  }

  return defaultLinkNode;
}
