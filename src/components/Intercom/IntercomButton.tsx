"use client";

import { useLayoutEffect } from "react";
import { useIntercom } from "react-use-intercom";
import { useCookiePreferences } from "@/lib/cookies/useCookiePreferences";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function IntercomButton() {
  const appId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID;
  const { boot, hardShutdown } = useIntercom();
  const { currentUser } = useCurrentUser();
  const { cookiePreferences } = useCookiePreferences();
  const functionalCookiesAllowed = cookiePreferences.includes("functional");

  useLayoutEffect(() => {
    if (!appId) {
      console.warn("Intercom app ID not configured");
      hardShutdown();
      return;
    }

    if (!functionalCookiesAllowed) {
      // eslint-disable-next-line no-console
      console.log("Not showing Intercom because functional cookies are not allowed");
      hardShutdown();
      return;
    }

    const intercomProps = {
      zIndex: 100,
    } as const;

    if (currentUser && !currentUser.hideIntercom) {
      boot({
        ...intercomProps,
        userId: currentUser._id,
        email: currentUser.email ?? undefined,
        name: currentUser.displayName,
      });
    } else if (!currentUser) {
      boot(intercomProps);
    } else {
      hardShutdown();
    }
  }, [currentUser, functionalCookiesAllowed, appId, boot, hardShutdown]);

  return null;
}
