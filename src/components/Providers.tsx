import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/users/currentUser";
import { LoginPopoverContextProvider } from "@/lib/hooks/useLoginPopoverContext";
import { NotificationsProvider } from "./Notifications/NotificationsProvider";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";
import { ItemsReadProvider } from "@/lib/hooks/useItemsRead";
import ClientCookieProvider from "./Cookies/ClientCookieProvider";

export default async function Providers({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  return (
    <ClientCookieProvider>
      <CurrentUserProvider user={currentUser}>
        <NotificationsProvider>
          <ItemsReadProvider>
            <LoginPopoverContextProvider>{children}</LoginPopoverContextProvider>
          </ItemsReadProvider>
        </NotificationsProvider>
      </CurrentUserProvider>
    </ClientCookieProvider>
  );
}
