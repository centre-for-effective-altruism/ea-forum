import type { ReactNode } from "react";
import NextLink from "next/link";

export default function Link({href, className, children}: Readonly<{
  href: string,
  className?: string,
  children: ReactNode,
}>) {
  // TODO Analytics
  return (
    <NextLink href={href} className={className}>
      {children}
    </NextLink>
  );
}
