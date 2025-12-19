import type { ReactNode } from "react";
import type { CurrentUser } from "@/lib/users/currentUser";

export default function NewConversationButton({
  children,
}: Readonly<{
  currentUser: CurrentUser | null;
  userId: string;
  from?: string;
  openInNewTab?: boolean;
  children: ReactNode;
}>) {
  // TODO
  return <div data-component="NewConversationButton">{children}</div>;
}
