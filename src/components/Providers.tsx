import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LoginPopoverContextProvider } from "@/lib/hooks/useLoginPopoverContext";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";
import { hashLoginToken } from "@/lib/authHelpers";
import { UsersRepo } from "@/lib/users/userQueries.queries";
import { getDbOrThrow } from "@/lib/db";
import NotificationsProvider from "./Notifications/NotificationsProvider";

export default async function Providers({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const loginToken = cookieStore.get("loginToken")?.value;
  const currentUser = loginToken
    ? await new UsersRepo(getDbOrThrow()).currentUser({
        hashedToken: hashLoginToken(loginToken),
      })
    : null;
  return (
    <CurrentUserProvider currentUser={currentUser}>
      <NotificationsProvider>
        <LoginPopoverContextProvider>{children}</LoginPopoverContextProvider>
      </NotificationsProvider>
    </CurrentUserProvider>
  );
}
