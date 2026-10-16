"use client";

import { useCallback, MouseEvent, ReactNode } from "react";
// eslint-disable-next-line no-restricted-imports
import NextLink from "next/link";
import { useTracking } from "@/lib/analyticsEvents";

export default function Link({
  // This default value is important even though this component is typed as
  // requiring a string - user generated content can be missing a value for
  // various reasons, and next/link throws an exception without one.
  href = "#",
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
      if (href?.[0] === "#") {
        ev.preventDefault();
        document.getElementById(href.slice(1))?.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      }
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
      // This is really important to avoid hammering the old ForumMagnum servers
      // with preemtive fetches - maybe we can remove it in the future though?
      prefetch={false}
    >
      {children}
    </NextLink>
  );
}
