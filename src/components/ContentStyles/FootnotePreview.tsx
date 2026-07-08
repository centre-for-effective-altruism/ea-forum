"use client";

import { useMemo, MouseEvent, ReactNode, useCallback, useState } from "react";
import { Document } from "domhandler";
import { isMobile } from "@/lib/environment";
import { getNodeById } from "@/lib/utils/contentHelpers";
import { isRegularClick } from "@/lib/utils/eventHelpers";
import { EXPAND_FOOTNOTES_EVENT } from "./CollapsedFootnotes";
import ContentProgressiveEnhancements from "./ContentProgressiveEnhancements";
import Tooltip from "../Tooltip";
import Popover from "../Popover";
import Link from "../Link";
import clsx from "clsx";
import Type from "../Type";

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
  const [isOpen, setIsOpen] = useState(false);

  const footnoteDocument = useMemo(() => {
    if (href && href.length > 1 && href[0] !== "#") {
      return null;
    }
    const footnoteId = href.slice(1);
    const node = getNodeById(document, footnoteId);
    return node ? new Document([node]) : null;
  }, [href, document]);

  const onClick = useCallback(
    (ev: MouseEvent) => {
      if (isRegularClick(ev) && isMobile() && footnoteDocument) {
        ev.preventDefault();
        setIsOpen(true);
      } else {
        window.dispatchEvent(
          new CustomEvent(EXPAND_FOOTNOTES_EVENT, { detail: href }),
        );
      }
    },
    [href, footnoteDocument],
  );

  const onClose = useCallback(() => setIsOpen(false), []);

  const linkNode = (
    <Link href={href} onClick={onClick} id={id} rel={rel} className={className}>
      {children}
    </Link>
  );

  const footnoteNode = footnoteDocument ? (
    <Type style="bodySmall">
      <ContentProgressiveEnhancements document={footnoteDocument} />
    </Type>
  ) : null;

  const baseClasses = `
    footnote-section footnotes max-w-full
    [&_.footnote-back-link]:hidden [&_.footnote-backref]:hidden
    [&>*>li]:list-none [&_.footnote-item]:list-none
  `;

  return footnoteDocument ? (
    <>
      <Tooltip
        interactable
        As="span"
        title={footnoteNode}
        popover
        tooltipClassName={clsx(baseClasses, "w-[400px] px-3! py-2!")}
      >
        {linkNode}
      </Tooltip>
      <Popover open={isOpen} onClose={onClose}>
        <div className={clsx(baseClasses, "w-[600px]")}>{footnoteNode}</div>
      </Popover>
    </>
  ) : (
    linkNode
  );
}
