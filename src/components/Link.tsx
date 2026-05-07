"use client";

import { useCallback, MouseEvent, ReactNode } from "react";
// eslint-disable-next-line no-restricted-imports
import NextLink from "next/link";
import { useTracking } from "@/lib/analyticsEvents";

export default function Link({
  href,
  id,
  rel,
  onClick: onClick_,
  className,
  openInNewTab,
  children,
}: Readonly<{
  href: string;
  id?: string;
  rel?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
  openInNewTab?: boolean;
  children: ReactNode;
}>) {
  const { captureEvent } = useTracking();

  const onClick = useCallback(
    (ev: MouseEvent<HTMLAnchorElement>) => {
      captureEvent("linkClicked", { to: href, buttonPressed: ev.button });
      onClick_?.(ev);
    },
    [captureEvent, href, onClick_],
  );

  const props = openInNewTab
    ? { rel: rel ?? "noopener noreferrer", target: "_blank" }
    : { rel };

  return (
    <NextLink
      id={id}
      href={href}
      onClick={onClick}
      className={className ?? "hover:opacity-70"}
      {...props}
    >
      {children}
    </NextLink>
  );
}
