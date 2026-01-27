import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/users/currentUser";
import { LoginPopoverContextProvider } from "@/lib/hooks/useLoginPopoverContext";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";
import { ItemsReadProvider } from "@/lib/hooks/useItemsRead";
import { MobileNavProvider } from "@/lib/hooks/useMobileNav";
import CookieClientProvider from "./Cookies/CookieClientProvider";
import IntercomClientProvider from "./Intercom/IntercomClientProvider";

export default async function Providers({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  return (
    <MobileNavProvider>
      <CookieClientProvider>
        <CurrentUserProvider user={currentUser}>
          <IntercomClientProvider>
            <ItemsReadProvider>
              <LoginPopoverContextProvider>{children}</LoginPopoverContextProvider>
            </ItemsReadProvider>
          </IntercomClientProvider>
        </CurrentUserProvider>
      </CookieClientProvider>
    </MobileNavProvider>
  );
}
