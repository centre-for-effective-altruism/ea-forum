"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushClientEvents } from "@/lib/analytics/storeEvent";
import { useTracking } from "@/lib/analyticsEvents";
import { isClient } from "@/lib/environment";

const useBeforeUnloadTracking = () => {
  const { captureEvent } = useTracking();
  useEffect(() => {
    const handler = () => {
      captureEvent("beforeUnloadFired");
      flushClientEvents(true);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [captureEvent]);
};

const usePageVisibility = () => {
  const { captureEvent } = useTracking();
  const doc = isClient ? document : null;
  const [pageIsVisible, setPageIsVisible] = useState(!doc?.hidden);
  const [pageVisibilityState, setPageVisibilityState] = useState(
    doc?.visibilityState,
  );

  useEffect(() => {
    if (pageVisibilityState) {
      captureEvent("pageVisibilityChange", {
        isVisible: pageIsVisible,
        visibilityState: pageVisibilityState,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!doc) {
      return;
    }
    const handler = () => {
      const isVisible = !doc.hidden;
      const visibilityState = doc.visibilityState;
      setPageIsVisible(isVisible);
      setPageVisibilityState(visibilityState);
      captureEvent("pageVisibilityChange", { isVisible, visibilityState });
    };
    window.addEventListener("visibilitychange", handler);
    return () => window.addEventListener("visibilitychange", handler);
  }, [doc, captureEvent]);

  return { pageIsVisible, pageVisibilityState };
};

const useIdlenessDetection = (timeoutInSeconds = 60) => {
  const { captureEvent } = useTracking();
  const [userIsIdle, setUserIsIdle] = useState(false);
  const countdownTimer = useRef<ReturnType<typeof setInterval>>(null);

  const inactivityAlert = useCallback(() => {
    captureEvent("idlenessDetection", { state: "inactive" });
    setUserIsIdle(true);
  }, [captureEvent, setUserIsIdle]);

  const reset = useCallback(() => {
    const prevUserIsIdle = userIsIdle;
    setUserIsIdle(false);
    clearTimeout(countdownTimer.current!);
    countdownTimer.current = setTimeout(inactivityAlert, timeoutInSeconds * 1000);
    if (prevUserIsIdle) {
      captureEvent("idlenessDetection", { state: "active" });
    }
  }, [userIsIdle, setUserIsIdle, captureEvent, inactivityAlert, timeoutInSeconds]);

  useEffect(() => {
    const events = ["mousemove", "keypress", "scroll"] as const;
    for (const event in events) {
      window.addEventListener(event, reset);
    }
    return () => {
      for (const event in events) {
        window.removeEventListener(event, reset);
      }
    };
  }, [reset]);

  useEffect(() => {
    reset();
    return () => clearTimeout(countdownTimer.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { userIsIdle };
};

const useCountUpTimer = (incrementsInSeconds = [10, 30], switchIncrement = 60) => {
  const { captureEvent } = useTracking();
  const [seconds, setSeconds] = useState(0);
  const [timerIsActive, setTimerIsActive] = useState(true);
  const [smallIncrementInSeconds, largeIncrementInSeconds] = incrementsInSeconds;
  const intervalTimer = useRef<ReturnType<typeof setInterval>>(null);

  const reset = useCallback(() => {
    setSeconds(0);
    setTimerIsActive(false);
  }, []);

  useEffect(() => {
    if (timerIsActive) {
      const increment =
        seconds < switchIncrement
          ? smallIncrementInSeconds
          : largeIncrementInSeconds;
      intervalTimer.current = setInterval(() => {
        setSeconds(seconds + increment);
        captureEvent("timerEvent", {
          seconds: seconds + increment,
          increment: increment,
        });
      }, increment * 1000);
    } else if (!timerIsActive && seconds !== 0) {
      clearInterval(intervalTimer.current!);
    }
    return () => clearInterval(intervalTimer.current!);
  }, [
    timerIsActive,
    setTimerIsActive,
    seconds,
    captureEvent,
    smallIncrementInSeconds,
    largeIncrementInSeconds,
    switchIncrement,
  ]);

  return { seconds, isActive: timerIsActive, setTimerIsActive, reset };
};

export default function PageAnalytics() {
  useBeforeUnloadTracking();
  const { pageIsVisible } = usePageVisibility();
  const { userIsIdle } = useIdlenessDetection(60);
  const { setTimerIsActive } = useCountUpTimer([10, 30], 60);

  useEffect(() => {
    setTimerIsActive(pageIsVisible && !userIsIdle);
  }, [pageIsVisible, userIsIdle, setTimerIsActive]);

  return null;
}
