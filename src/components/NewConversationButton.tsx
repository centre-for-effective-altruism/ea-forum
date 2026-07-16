"use client";

import type { ReactNode } from "react";

export default function NewConversationButton({
  children,
}: Readonly<{
  userId: string;
  from?: string;
  openInNewTab?: boolean;
  children: ReactNode;
}>) {
  // TODO
  return <div data-component="NewConversationButton">{children}</div>;
}
