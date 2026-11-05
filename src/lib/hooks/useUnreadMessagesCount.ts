"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { captureException } from "@sentry/nextjs";
import { useCurrentUser } from "./useCurrentUser";
import { usePolling } from "./usePolling";
import { rpc } from "../rpc";

const refetchListeners = new Set<() => void>();

export const refetchUnreadMessagesCount = () => {
  refetchListeners.forEach((refetch) => refetch());
};

export const useUnreadMessagesCount = () => {
  const { currentUser } = useCurrentUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const latestRequestId = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await rpc.messages.unreadCount();
      if (requestId === latestRequestId.current) {
        setUnreadCount(count);
      }
    } catch (e) {
      captureException(e);
      console.error("Error fetching unread messages count:", e);
    }
  }, [currentUser]);

  usePolling({
    callback: refetch,
    intervalMs: 60000,
    dependencies: [currentUser?._id],
  });

  useEffect(() => {
    const listener = () => void refetch();
    refetchListeners.add(listener);
    return () => {
      refetchListeners.delete(listener);
    };
  }, [refetch]);

  return unreadCount;
};
