"use client";

import type { ReactNode } from "react";
import { CookiesProvider } from "react-cookie";

export default function ClientCookieProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <CookiesProvider defaultSetOptions={{ path: "/" }}>{children}</CookiesProvider>
  );
}
