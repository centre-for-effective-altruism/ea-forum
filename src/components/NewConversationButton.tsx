"use client";

import { useCallback, ReactNode, MouseEvent } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useInitialConversation } from "@/lib/hooks/useInitiateConversation";
import {
  userCanInitiateConversations,
  userHasMessagingDisabled,
} from "@/lib/users/userHelpers";
import Tooltip from "./Tooltip";
import Type from "./Type";

export default function NewConversationButton({
  userId,
  children,
}: Readonly<{
  userId: string;
  from?: string;
  openInNewTab?: boolean;
  children: ReactNode;
}>) {
  const { currentUser } = useCurrentUser();
  const { initiateConversation } = useInitialConversation();

  const onClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      void initiateConversation({
        userIds: [userId],
        redirectOnSuccess: true,
      });
    },
    [initiateConversation, userId],
  );

  if (currentUser) {
    if (userHasMessagingDisabled(currentUser)) {
      return null;
    }
    if (currentUser?._id === userId) {
      return <div data-component="NewConversationButton">{children}</div>;
    }
    if (!userCanInitiateConversations(currentUser)) {
      return (
        <Tooltip
          title={<Type style="bodySmall">You must earn 10 karma to message</Type>}
          placement="bottom"
        >
          {children}
        </Tooltip>
      );
    }
  }

  return (
    <div data-component="NewConversationButton" onClick={onClick}>
      {children}
    </div>
  );
}
