import type { ReactNode } from "react";
import type { ICurrentUser } from "@/lib/users/userQueries.schemas";

export default function NewConversationButton({
  children,
}: Readonly<{
  currentUser: ICurrentUser | null;
  userId: string;
  from?: string;
  openInNewTab?: boolean;
  children: ReactNode;
}>) {
  // TODO
  return <div data-component="NewConversationButton">{children}</div>;
}
