"use client";

import { useCallback, useEffect, useState } from "react";
import { captureException } from "@sentry/nextjs";
import type { UserKarmaChanges } from "@/lib/users/karmaChangesTypes";
import { userHasKarmaChange } from "@/lib/users/userHelpers";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { rpc } from "@/lib/rpc";
import clsx from "clsx";
import StarIcon from "@heroicons/react/24/solid/StarIcon";
import BellIcon from "@heroicons/react/24/outline/BellIcon";
import NotificationsDropdown from "./NotificationsDropdown";
import HeaderButton from "../Header/HeaderButton";
import Type from "../Type";

export default function NotificationsHeaderButton() {
  const { currentUser } = useCurrentUser();
  const [karmaChanges, setKarmaChanges] = useState<UserKarmaChanges | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refetch = useCallback(async () => {
    if (!currentUser) {
      setKarmaChanges(null);
      setUnreadNotifications(0);
      return;
    }
    try {
      const [karmaChanges, unreadNotifications] = await Promise.all([
        rpc.users.karmaChanges({}),
        rpc.notifications.countUnread(),
      ]);
      setKarmaChanges(karmaChanges);
      setUnreadNotifications(unreadNotifications);
    } catch (e) {
      captureException(e);
      console.error("Error fetching karma changes:", e);
    }
  }, [currentUser]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  if (!currentUser) {
    return null;
  }

  const showStar = userHasKarmaChange(currentUser, karmaChanges);
  const showBadge = unreadNotifications > 0;

  return (
    <NotificationsDropdown
      karmaChanges={karmaChanges}
      onOpen={refetch}
      className="relative"
    >
      {showBadge && (
        <Type
          style="bodySmall"
          className="
            absolute top-[-2px] right-[2px] bg-primary rounded-[50%] px-[1px]
            min-w-[19px] text-center font-[600]! pointer-events-none
          "
        >
          {unreadNotifications}
        </Type>
      )}
      {showStar && (
        <StarIcon
          className={clsx(
            "w-4 text-karma-star absolute rotate-[345deg]",
            showBadge ? "top-[-8] right-[10px]" : "top-0 right-[6px]",
          )}
        />
      )}
      <HeaderButton Icon={BellIcon} description="Notifications" />
    </NotificationsDropdown>
  );
}
