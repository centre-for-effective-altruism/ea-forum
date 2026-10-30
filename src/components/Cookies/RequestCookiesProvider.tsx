import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/users/currentUser";
import CookieClientProvider from "./CookieClientProvider";

/**
 * The root cookie provider is part of the static shell, so it can't see the
 * request's cookies. This makes them available during SSR for the client
 * components below it, so it must be rendered inside a `Suspense` boundary.
 *
 * Cookies are only made available for logged-in users. For logged-out users
 * cookies are only available on the client, which allows us to do much more
 * aggressive caching for logged-out users in Cloudflare.
 */
export default async function RequestCookiesProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [currentUser, cookieStore] = await Promise.all([
    getCurrentUser(),
    cookies(),
  ]);
  if (!currentUser) {
    return children;
  }
  const initialCookies = Object.fromEntries(
    cookieStore.getAll().map((c) => [c.name, c.value]),
  );
  return (
    <CookieClientProvider initialCookies={initialCookies}>
      {children}
    </CookieClientProvider>
  );
}
