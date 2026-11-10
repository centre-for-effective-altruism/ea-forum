import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import CookieClientProvider from "./CookieClientProvider";

/**
 * The root cookie provider is part of the static shell, so it can't see the
 * request's cookies. This makes them available during SSR for the client
 * components below it, so it must be rendered inside a `Suspense` boundary.
 * Its children are rendered per-request, not prerendered once the cookies are
 * known.
 */
export default async function RequestCookiesProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await connection();
  const cookieStore = await cookies();
  const initialCookies = Object.fromEntries(
    cookieStore.getAll().map((c) => [c.name, c.value]),
  );
  return (
    <CookieClientProvider initialCookies={initialCookies}>
      {children}
    </CookieClientProvider>
  );
}
