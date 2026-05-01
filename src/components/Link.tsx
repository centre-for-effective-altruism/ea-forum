import type { MouseEvent, ReactNode } from "react";
// eslint-disable-next-line no-restricted-imports
import NextLink from "next/link";

export default function Link({
  href,
  id,
  rel,
  onClick,
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
  const props = openInNewTab
    ? { rel: rel ?? "noopener noreferrer", target: "_blank" }
    : { rel };

  // TODO Analytics
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
