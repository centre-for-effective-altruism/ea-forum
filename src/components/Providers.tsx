import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/users/currentUser";
import { LoginPopoverContextProvider } from "@/lib/hooks/useLoginPopoverContext";
import { NotificationsProvider } from "./Notifications/NotificationsProvider";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";

export default async function Providers({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  return (
    <CurrentUserProvider user={currentUser}>
      <NotificationsProvider>
        <LoginPopoverContextProvider>{children}</LoginPopoverContextProvider>
      </NotificationsProvider>
    </CurrentUserProvider>
  );
}
