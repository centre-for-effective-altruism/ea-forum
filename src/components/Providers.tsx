import type { ReactNode } from "react";
import { LoginPopoverContextProvider } from "@/lib/hooks/useLoginPopoverContext";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";

export default function Providers({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <CurrentUserProvider>
      <LoginPopoverContextProvider>{children}</LoginPopoverContextProvider>
    </CurrentUserProvider>
  );
}
