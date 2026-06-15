import { useEffect, useRef } from "react";

export const usePolling = ({
  callback,
  intervalMs,
  pollWhileTabInactive,
  dependencies = [],
}: {
  /** Callback to run */
  callback: () => void;
  /** Polling interval in milliseconds  */
  intervalMs: number;
  /** Whether to continue polling while the tab is inactive (default false) */
  pollWhileTabInactive?: boolean;
  /** Dependency array for the callback */
  dependencies?: unknown[];
}) => {
  const callbackRef = useRef(callback);

  // Keep latest callback without recreating intervals unnecessarily
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      callbackRef.current();
    };

    const startPolling = () => {
      if (interval) {
        return;
      }
      interval = setInterval(tick, intervalMs);
    };

    const stopPolling = () => {
      if (!interval) {
        return;
      }
      clearInterval(interval);
      interval = null;
    };

    const handleVisibilityChange = () => {
      if (pollWhileTabInactive) {
        return;
      }
      if (document.visibilityState === "visible") {
        tick();
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Initial run
    tick();

    if (pollWhileTabInactive || document.visibilityState === "visible") {
      startPolling();
    }

    if (!pollWhileTabInactive) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      stopPolling();

      if (!pollWhileTabInactive) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, pollWhileTabInactive, ...dependencies]);
};
