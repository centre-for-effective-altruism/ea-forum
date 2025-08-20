"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import type { INotificationDisplays } from "@/lib/notifications/notificationsQueries.schemas";
import { getNotifications } from "@/lib/notifications/notificationsApi";

type NotificationsContext = {
  notifications: INotificationDisplays[];
};

const notificationsContext = createContext<NotificationsContext | null>(null);

export default function NotificationsProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { data } = getNotifications.use({
    params: {},
    pollIntervalMs: 30000,
  });

  const value = useMemo(
    () => ({
      notifications: data?.notifications ?? [],
    }),
    [data],
  );

  return (
    <notificationsContext.Provider value={value}>
      {children}
    </notificationsContext.Provider>
  );
}

export const useNotifications = (): NotificationsContext => {
  const context = useContext(notificationsContext);
  if (!context) {
    throw new Error("No notifications context found");
  }
  return context;
};
