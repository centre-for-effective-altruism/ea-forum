"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import { getNotifications } from "@/lib/notifications/notificationsApi";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import type { NotificationDisplay } from "@/lib/notifications/notificationDisplayTypes";

type NotificationsContext = {
  notifications: NotificationDisplay[];
};

const notificationsContext = createContext<NotificationsContext | null>(null);

export function NotificationsProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { currentUser } = useCurrentUser();
  const { data } = getNotifications.use({
    params: {},
    pollIntervalMs: 30000,
    skip: !currentUser,
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
