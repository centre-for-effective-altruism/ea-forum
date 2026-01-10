"use client";

import type { ReactNode } from "react";
import { CookiesProvider } from "react-cookie";

export default function CookieClientProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <CookiesProvider defaultSetOptions={{ path: "/" }}>{children}</CookiesProvider>
  );
}
