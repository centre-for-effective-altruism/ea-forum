import { ReactNode, useCallback } from "react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { userGetProfileUrl, userGetStatsUrl } from "@/lib/users/userHelpers";
import { logoutAction } from "@/lib/users/authActions";
import PencilSquareIcon from "@heroicons/react/24/outline/PencilSquareIcon";
import SunIcon from "@heroicons/react/24/outline/SunIcon";
import BookmarkIcon from "@heroicons/react/24/outline/BookmarkIcon";
import ChartBarIcon from "@heroicons/react/24/outline/ChartBarIcon";
import Cog6ToothIcon from "@heroicons/react/24/outline/Cog6ToothIcon";
import DropdownMenu from "./DropdownMenu";
import UserProfileImage from "../UserProfileImage";

export default function UserDropdownMenu({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { currentUser } = useCurrentUser();

  const ProfileImageIcon = useCallback(() => {
    return <UserProfileImage user={currentUser} size={24} />;
  }, [currentUser]);

  const onLogout = useCallback(async () => {
    await logoutAction();
    window.location.reload();
  }, []);

  if (!currentUser?.displayName) {
    return null;
  }

  return (
    <DropdownMenu
      placement="bottom-end"
      className="w-[214px] max-w-full"
      items={[
        {
          title: currentUser.displayName,
          Icon: ProfileImageIcon,
          href: userGetProfileUrl({ user: currentUser }),
        },
        "divider",
        {
          title: "Write new",
          Icon: PencilSquareIcon,
        },
        {
          title: "Theme",
          Icon: SunIcon,
        },
        {
          title: "Saved & read",
          Icon: BookmarkIcon,
          href: "/saved",
        },
        {
          title: "Post stats",
          Icon: ChartBarIcon,
          href: userGetStatsUrl(currentUser),
        },
        {
          title: "Settings",
          Icon: Cog6ToothIcon,
          href: "/account",
        },
        "divider",
        {
          title: "Logout",
          onClick: onLogout,
        },
      ]}
    >
      <div data-component="UserDropdownMenu">{children}</div>
    </DropdownMenu>
  );
}
