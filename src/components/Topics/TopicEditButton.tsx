"use client";

import { MouseEvent, useCallback } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import PencilSquareIcon from "@heroicons/react/24/outline/PencilSquareIcon";
import LockClosedIcon from "@heroicons/react/24/outline/LockClosedIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default function TopicEditButton({
  href,
  restrictionReason,
}: Readonly<{
  href: string;
  restrictionReason: string | null;
}>) {
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const onClick = useCallback(
    (ev: MouseEvent<HTMLAnchorElement>) => {
      if (!currentUser) {
        ev.preventDefault();
        onSignup();
      }
    },
    [currentUser, onSignup],
  );
  if (restrictionReason) {
    return (
      <Tooltip
        title={<Type style="bodySmall">{restrictionReason}</Type>}
        placement="bottom"
        tooltipClassName="max-w-[300px]"
      >
        <Type
          As="span"
          style="bodyMedium"
          className="flex items-center gap-1 text-gray-400 cursor-not-allowed"
        >
          <LockClosedIcon className="w-4" />
          Edit
        </Type>
      </Tooltip>
    );
  }
  return (
    <Type style="bodyMedium">
      <Link
        href={href}
        onClick={onClick}
        className="flex items-center gap-1 text-gray-600 hover:text-gray-1000"
      >
        <PencilSquareIcon className="w-4" />
        Edit
      </Link>
    </Type>
  );
}
