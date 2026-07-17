"use client";

import { useUserSubscriptions } from "@/lib/hooks/useSubscriptions";
import DropdownMenu from "../Dropdown/DropdownMenu";
import BellIcon from "@heroicons/react/24/outline/BellIcon";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import Type from "../Type";

export default function UserSubscribeButton({
  userId,
}: Readonly<{
  userId: string;
}>) {
  const { subscriptionMenuItems } = useUserSubscriptions(userId);
  return (
    <DropdownMenu items={subscriptionMenuItems}>
      <button
        data-component="UserSubscribeButton"
        className="
          cursor-pointer flex items-center gap-1 px-3 py-2 rounded
          text-gray-1000 bg-gray-300 hover:bg-gray-400
        "
      >
        <BellIcon className="w-4" />
        <Type>Get notified</Type>
        <ChevronDownIcon className="w-4" />
      </button>
    </DropdownMenu>
  );
}
