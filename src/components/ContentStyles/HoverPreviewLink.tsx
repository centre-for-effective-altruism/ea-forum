import { useMemo, ReactNode } from "react";
import type { Document } from "domhandler";
import { usePathname } from "next/navigation";
import {
  locationHashIsFootnote,
  locationHashIsFootnoteBackreference,
  parseLinkContentType,
} from "@/lib/utils/contentHelpers";
import FootnotePreview from "./FootnotePreview";
import Link from "../Link";
import Tooltip from "../Tooltip";
import Type from "../Type";
import LazyPostsTooltip from "../LazyPostsTooltip";

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
  const pathname = usePathname();
  const linkContentType = useMemo(() => {
    return parseLinkContentType(pathname, href);
  }, [pathname, href]);

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

  switch (linkContentType?.type) {
    case "post":
      return (
        <LazyPostsTooltip
          As="span"
          postId={linkContentType.postId}
          className="[&_a]:after:content-['°'] [&_a]:after:ml-px"
        >
          {defaultLinkNode}
        </LazyPostsTooltip>
      );
    case "user":
    // TODO: User hover previews
    case "tag":
    // TODO: Tag hover previews
    case "sequence":
    // TODO: Sequence hover previews
    default:
      break;
  }

  return (
    <Tooltip
      As="span"
      title={<Type style="bodySmall">{href}</Type>}
      tooltipClassName="max-w-[calc(min(100%,400px))]"
    >
      {defaultLinkNode}
    </Tooltip>
  );
}
