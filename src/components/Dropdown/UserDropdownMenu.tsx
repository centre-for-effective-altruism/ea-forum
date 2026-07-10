"use client";

import { ReactNode, useCallback, useState } from "react";
import { useTheme } from "@/lib/hooks/useTheme";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { userGetProfileUrl, userGetStatsUrl } from "@/lib/users/userHelpers";
import { rpc } from "@/lib/rpc";
import posthog from "posthog-js";
import AdjustmentsHorizontalIcon from "@heroicons/react/24/outline/AdjustmentsHorizontalIcon";
import PencilSquareIcon from "@heroicons/react/24/outline/PencilSquareIcon";
import Cog6ToothIcon from "@heroicons/react/24/outline/Cog6ToothIcon";
import BookmarkIcon from "@heroicons/react/24/outline/BookmarkIcon";
import ChartBarIcon from "@heroicons/react/24/outline/ChartBarIcon";
import CheckIcon from "@heroicons/react/24/solid/CheckIcon";
import SunIcon from "@heroicons/react/24/outline/SunIcon";
import UserProfileImage from "../UserProfileImage";
import DropdownMenu from "./DropdownMenu";
import QuickTakePopover from "../QuickTakes/QuickTakePopover";

const Check = () => <CheckIcon className="w-4 text-primary" />;

export default function UserDropdownMenu({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { currentUser } = useCurrentUser();
  const { theme, updateTheme } = useTheme();
  const [quickTakeOpen, setQuickTakeOpen] = useState(false);

  const ProfileImageIcon = useCallback(() => {
    return <UserProfileImage user={currentUser} size={24} />;
  }, [currentUser]);

  const onOpenQuickTake = useCallback(() => setQuickTakeOpen(true), []);
  const onCloseQuickTake = useCallback(() => setQuickTakeOpen(false), []);

  const onLogout = useCallback(async () => {
    await rpc.users.logout();
    posthog.reset();
    window.location.reload();
  }, []);

  if (!currentUser?.displayName) {
    return null;
  }

  return (
    <>
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
            submenu: [
              {
                title: "Post",
                href: "/newPost",
              },
              {
                title: "Question",
                href: "/newPost?question=true",
              },
              {
                title: "Quick take",
                onClick: onOpenQuickTake,
              },
              "divider",
              {
                title: "Event",
                href: "/newPost?eventForm=true",
              },
              {
                title: "Sequence",
                href: "/sequencesnew",
              },
            ],
          },
          {
            title: "Theme",
            Icon: SunIcon,
            submenu: [
              {
                title: "Auto",
                onClick: updateTheme.bind(null, "auto"),
                afterNode: theme === "auto" ? <Check /> : undefined,
              },
              {
                title: "Light",
                onClick: updateTheme.bind(null, "default"),
                afterNode: theme === "default" ? <Check /> : undefined,
              },
              {
                title: "Dark",
                onClick: updateTheme.bind(null, "dark"),
                afterNode: theme === "dark" ? <Check /> : undefined,
              },
            ],
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
          ...(currentUser.isAdmin
            ? [
                {
                  title: "Admin",
                  Icon: AdjustmentsHorizontalIcon,
                  href: "/admin",
                },
              ]
            : []),
          "divider",
          {
            title: "Logout",
            onClick: onLogout,
          },
        ]}
      >
        <div data-component="UserDropdownMenu">{children}</div>
      </DropdownMenu>
      <QuickTakePopover open={quickTakeOpen} onClose={onCloseQuickTake} />
    </>
  );
}
