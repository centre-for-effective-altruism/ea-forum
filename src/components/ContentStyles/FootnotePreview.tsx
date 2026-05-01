import { ReactNode } from "react";
import Tooltip from "../Tooltip";
import Link from "../Link";

export default function FootnotePreview({
  href,
  id,
  rel,
  className,
  children,
}: Readonly<{
  href: string;
  id?: string;
  rel?: string;
  className?: string;
  children: ReactNode;
}>) {
  return (
    <Tooltip interactable As="span" title={<div />}>
      <Link href={href} id={id} rel={rel} className={className}>
        {children}
      </Link>
    </Tooltip>
  );
}
