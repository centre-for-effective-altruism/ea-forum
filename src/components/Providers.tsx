import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LoginPopoverContextProvider } from "@/lib/hooks/useLoginPopoverContext";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";
import { hashLoginToken, LOGIN_TOKEN_COOKIE_NAME } from "@/lib/authHelpers";
import { fetchCurrentUserByHashedToken } from "@/lib/users/currentUser";
import NotificationsProvider from "./Notifications/NotificationsProvider";

export default async function Providers({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const loginToken = cookieStore.get(LOGIN_TOKEN_COOKIE_NAME)?.value;
  const currentUser = loginToken
    ? await fetchCurrentUserByHashedToken(hashLoginToken(loginToken))
    : null;
  return (
    <CurrentUserProvider user={currentUser}>
      <NotificationsProvider>
        <LoginPopoverContextProvider>{children}</LoginPopoverContextProvider>
      </NotificationsProvider>
    </CurrentUserProvider>
  );
}
