import type { ReactNode } from "react";
import NextLink from "next/link";

export default function Link({
  href,
  className,
  openInNewTab,
  children,
}: Readonly<{
  href: string;
  className?: string;
  openInNewTab?: boolean;
  children: ReactNode;
}>) {
  // TODO Analytics
  return (
    <NextLink
      href={href}
      className={className ?? "hover:opacity-70"}
      {...(openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </NextLink>
  );
}
