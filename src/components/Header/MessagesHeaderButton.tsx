"use client";

import { useUnreadMessagesCount } from "@/lib/hooks/useUnreadMessagesCount";
import EnvelopeIcon from "@heroicons/react/24/outline/EnvelopeIcon";
import HeaderButton from "./HeaderButton";
import Link from "../Link";
import Type from "../Type";

export default function MessagesHeaderButton() {
  const unreadCount = useUnreadMessagesCount();
  return (
    <Link href="/inbox" className="relative hover:opacity-100!">
      {unreadCount > 0 && (
        <Type
          style="bodySmall"
          className="
            absolute top-[-2px] right-[2px] bg-primary rounded-[50%] px-[1px]
            min-w-[19px] text-center font-[600]! pointer-events-none
            text-always-white
          "
        >
          {unreadCount}
        </Type>
      )}
      <HeaderButton Icon={EnvelopeIcon} description="Messages" />
    </Link>
  );
}
