"use client";

import { useEffect, type ReactNode } from "react";
import { CookiesProvider } from "react-cookie";
import { initRecaptcha } from "@/lib/recaptcha";

export default function CookieClientProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  useEffect(() => {
    void initRecaptcha();
  }, []);
  return (
    <CookiesProvider defaultSetOptions={{ path: "/" }}>{children}</CookiesProvider>
  );
}
