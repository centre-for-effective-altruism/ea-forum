"use client";

import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import EnvelopeIcon from "@heroicons/react/24/outline/EnvelopeIcon";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import NotificationsHeaderButton from "../Notifications/NotificationsHeaderButton";
import UserDropdownMenu from "../Dropdown/UserDropdownMenu";
import LoginPopover from "@/components/Auth/LoginPopover";
import UserProfileImage from "../UserProfileImage";
import HeaderButton from "./HeaderButton";
import Button from "@/components/Button";
import Link from "@/components/Link";

export function HeaderUserSkeleton() {
  return <div className="h-9 w-[140px] rounded bg-gray-200" />;
}

export default function HeaderUserButtons() {
  const { onLogin, onSignup } = useLoginPopoverContext();
  const { currentUser } = useCurrentUser();
  return currentUser ? (
    <>
      <NotificationsHeaderButton />
      <Link href="/inbox" className="hover:opacity-100!">
        <HeaderButton Icon={EnvelopeIcon} description="Messages" />
      </Link>
      <UserDropdownMenu>
        <button
          className="
            cursor-pointer hover:bg-item-hover rounded h-9 px-1.5
            flex items-center gap-1
          "
        >
          <UserProfileImage user={currentUser} size={32} />
          <ChevronDownIcon className="w-[16px] text-gray-600" />
        </button>
      </UserDropdownMenu>
    </>
  ) : (
    <>
      <Button variant="greyFilled" onClick={onLogin}>
        Login
      </Button>
      <Button variant="primaryFilled" onClick={onSignup} className="max-sm:hidden">
        Sign up
      </Button>
      <LoginPopover />
    </>
  );
}
