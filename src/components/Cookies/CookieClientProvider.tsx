"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { Cookies, CookiesProvider } from "react-cookie";
import { initRecaptcha } from "@/lib/recaptcha";

export default function CookieClientProvider({
  initialCookies,
  children,
}: Readonly<{
  initialCookies?: Record<string, string>;
  children: ReactNode;
}>) {
  const cookies = useMemo(() => new Cookies(initialCookies), [initialCookies]);

  useEffect(() => {
    void initRecaptcha();
  }, []);

  return (
    <CookiesProvider defaultSetOptions={{ path: "/" }} cookies={cookies}>
      {children}
    </CookiesProvider>
  );
}
