"use client";

import type { ReactNode } from "react";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import Type from "../Type";

export default function WrappedStrawPoll({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { currentUser } = useCurrentUser();
  const { onLogin } = useLoginPopoverContext();
  return currentUser ? (
    <>{children}</>
  ) : (
    <div className="relative p-4 rounded border-1 border-gray-300 flex flex-col gap-2">
      <div className="bg-strawpoll h-1 absolute top-0 left-0 right-0" />
      <Type style="bodyHeavy">This poll is hidden</Type>
      <Type>
        Please{" "}
        <span
          role="button"
          onClick={onLogin}
          className="text-primary hover:opacity-70 cursor-pointer"
        >
          log in
        </span>{" "}
        to vote in this poll.
      </Type>
    </div>
  );
}
