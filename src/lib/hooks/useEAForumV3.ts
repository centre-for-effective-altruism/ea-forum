"use client";

import { useCallback } from "react";
import { useCookiesWithConsent } from "../cookies/useCookiesWithConsent";

const PREFER_NEW_SITE_COOKIE = "prefer_ea_forum_v3" as const;

/**
 * Hook for managing the EA Forum V3 preference during strangler fig migration.
 */
export const useEAForumV3 = (): {
  preferNewSite: boolean;
  setPreferNewSite: (value: boolean) => void;
} => {
  const [cookies, setCookie] = useCookiesWithConsent([PREFER_NEW_SITE_COOKIE]);

  // universal-cookie auto-parses, so "true" becomes boolean true
  const rawCookieValue = cookies[PREFER_NEW_SITE_COOKIE] as
    | string
    | boolean
    | undefined;
  const preferNewSite = rawCookieValue === "true" || rawCookieValue === true;

  const setPreferNewSite = useCallback(
    (value: boolean) => {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      setCookie(PREFER_NEW_SITE_COOKIE, value ? "true" : "false", {
        path: "/",
        expires: oneYearFromNow,
      });
      window.location.reload();
    },
    [setCookie],
  );

  return {
    preferNewSite,
    setPreferNewSite,
  };
};
