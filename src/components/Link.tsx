import type { MouseEvent, ReactNode } from "react";
import NextLink from "next/link";

export default function Link({
  href,
  onClick,
  className,
  openInNewTab,
  children,
}: Readonly<{
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
  openInNewTab?: boolean;
  children: ReactNode;
}>) {
  // TODO Analytics
  return (
    <NextLink
      href={href}
      onClick={onClick}
      className={className ?? "hover:opacity-70"}
      {...(openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </NextLink>
  );
}
