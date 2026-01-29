import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/users/currentUser";
import { LoginPopoverContextProvider } from "@/lib/hooks/useLoginPopoverContext";
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
  const currentUser = await getCurrentUser();
  return (
    <FloatingTreeClientProvider>
      <MobileNavProvider>
        <CookieClientProvider>
          <CurrentUserProvider user={currentUser}>
            <IntercomClientProvider>
              <SubscriptionProvider>
                <ItemsReadProvider>
                  <LoginPopoverContextProvider>
                    {children}
                  </LoginPopoverContextProvider>
                </ItemsReadProvider>
              </SubscriptionProvider>
            </IntercomClientProvider>
          </CurrentUserProvider>
        </CookieClientProvider>
      </MobileNavProvider>
    </FloatingTreeClientProvider>
  );
}
