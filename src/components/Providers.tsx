import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/users/currentUser";
import { LoginPopoverContextProvider } from "@/lib/hooks/useLoginPopoverContext";
import { ThemeProvider } from "@/lib/hooks/useTheme";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";
import { ItemsReadProvider } from "@/lib/hooks/useItemsRead";
import { MobileNavProvider } from "@/lib/hooks/useMobileNav";
import { SubscriptionProvider } from "@/lib/hooks/useSubscriptions";
import CookieClientProvider from "./Cookies/CookieClientProvider";
import IntercomClientProvider from "./Intercom/IntercomClientProvider";
import FloatingTreeClientProvider from "./FloatingTreeClientProvider";

export default async function Providers({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [currentUser, cookieStore] = await Promise.all([
    getCurrentUser(),
    cookies(),
  ]);
  const initialCookies = Object.fromEntries(
    cookieStore.getAll().map((c) => [c.name, c.value]),
  );
  return (
    <FloatingTreeClientProvider>
      <MobileNavProvider>
        <CookieClientProvider initialCookies={initialCookies}>
          <CurrentUserProvider user={currentUser}>
            <ThemeProvider>
              <IntercomClientProvider>
                <SubscriptionProvider>
                  <ItemsReadProvider>
                    <LoginPopoverContextProvider>
                      {children}
                    </LoginPopoverContextProvider>
                  </ItemsReadProvider>
                </SubscriptionProvider>
              </IntercomClientProvider>
            </ThemeProvider>
          </CurrentUserProvider>
        </CookieClientProvider>
      </MobileNavProvider>
    </FloatingTreeClientProvider>
  );
}
