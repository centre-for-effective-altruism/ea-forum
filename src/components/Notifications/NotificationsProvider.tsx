"use client";

import { createContext, ReactNode, useEffect, useMemo, useState } from "react";
import type { INotificationDisplays } from "@/lib/notifications/notificationsQueries.queries";

type NotificationsContext = {
  notifications: INotificationDisplays[];
};

const notificationsContext = createContext<NotificationsContext | null>(null);

export default function NotificationsProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [notifications, setNotifications] = useState<INotificationDisplays[]>([]);

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/notifications");
      if (response.status !== 200) {
        throw new Error("Couldn't fetch notifications");
      }
      const { notifications } = await response.json();
      setNotifications(notifications);
    })();
  }, []);

  const value = useMemo(() => ({ notifications }), [notifications]);
  return (
    <notificationsContext.Provider value={value}>
      {children}
    </notificationsContext.Provider>
  );
}
