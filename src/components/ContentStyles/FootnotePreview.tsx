import { useMemo, ReactNode } from "react";
import { Document } from "domhandler";
import { getNodeById } from "@/lib/utils/contentHelpers";
import ContentProgressiveEnhancements from "./ContentProgressiveEnhancements";
import Tooltip from "../Tooltip";
import Link from "../Link";

export default function FootnotePreview({
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
  const footnoteDocument = useMemo(() => {
    if (href && href.length > 1 && href[0] !== "#") {
      return null;
    }
    const footnoteId = href.slice(1);
    const node = getNodeById(document, footnoteId);
    if (!node) {
      return null;
    }
    return new Document([node]);
  }, [href, document]);

  const linkNode = (
    <Link href={href} id={id} rel={rel} className={className}>
      {children}
    </Link>
  );

  if (!footnoteDocument) {
    return linkNode;
  }

  return (
    <Tooltip
      interactable
      As="span"
      title={<ContentProgressiveEnhancements document={footnoteDocument} />}
      tooltipClassName="
        w-[400px] max-w-full px-3! py-2!
        [&_.footnote-back-link]:hidden [&>li]:list-none
      "
    >
      {linkNode}
    </Tooltip>
  );
}
