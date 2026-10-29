import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/users/currentUser";
import { LoginPopoverContextProvider } from "@/lib/hooks/useLoginPopoverContext";
import { CommentAwardsUsedProvider } from "@/lib/commentAwards/useCommentAwardsUsed";
import { ClientIdProvider } from "@/lib/hooks/useClientId";
import { ThemeProvider } from "@/lib/hooks/useTheme";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";
import { ItemsReadProvider } from "@/lib/hooks/useItemsRead";
import { MobileNavProvider } from "@/lib/hooks/useMobileNav";
import { SubscriptionProvider } from "@/lib/hooks/useSubscriptions";
import CookieClientProvider from "./Cookies/CookieClientProvider";
import IntercomClientProvider from "./Intercom/IntercomClientProvider";
import FloatingTreeClientProvider from "./FloatingTreeClientProvider";

export default function Providers({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // This isn't awaited so that the providers can be part of the static shell.
  // Request cookies are made available to SSR by `RequestCookiesProvider`.
  const userPromise = getCurrentUser();
  return (
    <FloatingTreeClientProvider>
      <MobileNavProvider>
        <CookieClientProvider>
          <ClientIdProvider>
            <CurrentUserProvider userPromise={userPromise}>
              <ThemeProvider>
                <IntercomClientProvider>
                  <SubscriptionProvider>
                    <ItemsReadProvider>
                      <LoginPopoverContextProvider>
                        <CommentAwardsUsedProvider>
                          {children}
                        </CommentAwardsUsedProvider>
                      </LoginPopoverContextProvider>
                    </ItemsReadProvider>
                  </SubscriptionProvider>
                </IntercomClientProvider>
              </ThemeProvider>
            </CurrentUserProvider>
          </ClientIdProvider>
        </CookieClientProvider>
      </MobileNavProvider>
    </FloatingTreeClientProvider>
  );
}
