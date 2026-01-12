import type { ReactNode } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { useNotifications } from "./NotificationsProvider";
import NotificationDisplay from "./NotificationDisplay";
import Dropdown from "../Dropdown/Dropdown";
import Type from "../Type";

export default function NotificationsDropdown({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { notifications } = useNotifications();
  return (
    <AnalyticsContext pageSectionContext="notificationsPopover">
      <Dropdown
        placement="bottom"
        menu={
          <div
            data-component="NotificationsDropdown"
            className={`
              bg-white rounded shadow px-1 py-2 border border-gray-100
              w-[400px] max-w-full max-h-[90vh] overflow-y-auto
            `}
          >
            <div className="px-2">
              <Type className="text-[24px] font-[600] mb-6">Notifications</Type>
              <Type style="sectionTitleSmall" className="mb-4">
                Karma & reacts
              </Type>
              <Type style="sectionTitleSmall" className="mb-4">
                Posts & comments
              </Type>
            </div>
            {notifications.map((notification) => (
              <NotificationDisplay
                key={notification._id}
                notification={notification}
              />
            ))}
          </div>
        }
      >
        {children}
      </Dropdown>
    </AnalyticsContext>
  );
}
