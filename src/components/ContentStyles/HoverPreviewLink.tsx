import { useMemo, ReactNode } from "react";
import type { Document } from "domhandler";
import { usePathname } from "next/navigation";
import {
  locationHashIsFootnote,
  locationHashIsFootnoteBackreference,
  parseLinkContentType,
} from "@/lib/utils/contentHelpers";
import LazySequenceTooltip from "../LazySequenceTooltip";
import LazyPostsTooltip from "../LazyPostsTooltip";
import LazyUsersTooltip from "../LazyUsersTooltip";
import LazyTagTooltip from "../LazyTagTooltip";
import FootnotePreview from "./FootnotePreview";
import Tooltip from "../Tooltip";
import Type from "../Type";
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

  // A page with a special tooltip component
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
      return (
        <LazyUsersTooltip
          As="span"
          userSlug={linkContentType.userSlug}
          className="[&_a]:after:content-['°'] [&_a]:after:ml-px"
        >
          {defaultLinkNode}
        </LazyUsersTooltip>
      );
    case "tag":
      return (
        <LazyTagTooltip
          As="span"
          tagSlug={linkContentType.tagSlug}
          className="[&_a]:after:content-['°'] [&_a]:after:ml-px"
        >
          {defaultLinkNode}
        </LazyTagTooltip>
      );
    case "sequence":
      return (
        <LazySequenceTooltip
          As="span"
          sequenceId={linkContentType.sequenceId}
          className="[&_a]:after:content-['°'] [&_a]:after:ml-px"
        >
          {defaultLinkNode}
        </LazySequenceTooltip>
      );
    default:
      break;
  }

  // Anything else, just show the URL in a tooltip
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
