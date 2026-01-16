"use client";

import { useCallback, useEffect } from "react";
import { useCookiesWithConsent } from "../cookies/useCookiesWithConsent";
import { useCurrentUser } from "./useCurrentUser";

const PREFER_NEW_SITE_COOKIE = "prefer_ea_forum_v3" as const;

/**
 * Hook for managing the EA Forum V3 preference during strangler fig migration.
 * Clears the cookie automatically if the user is not a real admin.
 */
export const useEAForumV3 = (): {
  preferNewSite: boolean;
  setPreferNewSite: (value: boolean) => void;
} => {
  const { currentUser } = useCurrentUser();
  const [cookies, setCookie, removeCookie] = useCookiesWithConsent([
    PREFER_NEW_SITE_COOKIE,
  ]);

  // universal-cookie auto-parses, so "true" becomes boolean true
  const rawCookieValue = cookies[PREFER_NEW_SITE_COOKIE] as
    | string
    | boolean
    | undefined;
  const preferNewSite = rawCookieValue === "true" || rawCookieValue === true;
  const isRealAdmin = currentUser?.groups?.includes("realAdmins") ?? false;

  // Clear the cookie if user is not a real admin
  // BUT only if we actually have a currentUser (don't clear while loading)
  useEffect(() => {
    if (currentUser && !isRealAdmin) {
      removeCookie(PREFER_NEW_SITE_COOKIE, { path: "/" });
    }
  }, [currentUser, isRealAdmin, removeCookie]);

  const setPreferNewSite = useCallback(
    (value: boolean) => {
      if (value) {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        setCookie(PREFER_NEW_SITE_COOKIE, "true", {
          path: "/",
          expires: oneYearFromNow,
        });
      } else {
        removeCookie(PREFER_NEW_SITE_COOKIE, { path: "/" });
      }
      window.location.reload();
    },
    [setCookie, removeCookie],
  );

  return {
    preferNewSite,
    setPreferNewSite,
  };
};
