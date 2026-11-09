"use client";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { userCanInitiateConversations } from "@/lib/users/userHelpers";
import PencilSquareIcon from "@heroicons/react/24/outline/PencilSquareIcon";
import Tooltip from "../Tooltip";
import Button from "../Button";
import Type from "../Type";

export default function InboxNewConversationButton({
  onClick,
  variant,
}: Readonly<{
  onClick: () => void;
  variant: "icon" | "button";
}>) {
  const { currentUser } = useCurrentUser();
  const canInitiate = userCanInitiateConversations(currentUser);
  const button =
    variant === "icon" ? (
      <button
        aria-label="New conversation"
        onClick={onClick}
        disabled={!canInitiate}
        className="
          cursor-pointer rounded p-1 text-gray-600 hover:bg-item-hover
          disabled:cursor-not-allowed disabled:opacity-50
        "
      >
        <PencilSquareIcon className="w-6" />
      </button>
    ) : (
      <Button
        onClick={onClick}
        disabled={!canInitiate}
        className="flex items-center gap-1"
      >
        <PencilSquareIcon className="w-5" />
        Start a new conversation
      </Button>
    );
  if (canInitiate) {
    return button;
  }
  return (
    <Tooltip
      title={<Type style="bodySmall">You must earn 10 karma to message</Type>}
      placement="bottom"
    >
      {button}
    </Tooltip>
  );
}
