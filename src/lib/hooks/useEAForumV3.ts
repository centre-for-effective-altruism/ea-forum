"use client";

import { useCallback } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { useCookiesWithConsent } from "../cookies/useCookiesWithConsent";
import { userIsAdminOrMod, userIsRealAdmin } from "../users/userHelpers";

const PREFER_NEW_SITE_COOKIE = "prefer_ea_forum_v3" as const;

/**
 * Hook for managing the EA Forum V3 preference during strangler fig migration.
 */
export const useEAForumV3 = (): {
  showNewSiteToggle: boolean;
  preferNewSite: boolean;
  setPreferNewSite: (value: boolean) => void;
} => {
  const { currentUser } = useCurrentUser();
  const [cookies, setCookie, removeCookie] = useCookiesWithConsent([
    PREFER_NEW_SITE_COOKIE,
  ]);

  const showNewSiteToggle =
    userIsRealAdmin(currentUser) || userIsAdminOrMod(currentUser);

  // universal-cookie auto-parses, so "true" becomes boolean true
  const rawCookieValue = cookies[PREFER_NEW_SITE_COOKIE] as
    | string
    | boolean
    | undefined;
  const preferNewSite = rawCookieValue !== "false" && rawCookieValue !== false;

  const setPreferNewSite = useCallback(
    (value: boolean) => {
      if (value) {
        removeCookie(PREFER_NEW_SITE_COOKIE);
      } else {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        setCookie(PREFER_NEW_SITE_COOKIE, "false", {
          path: "/",
          expires: oneYearFromNow,
        });
      }
      window.location.reload();
    },
    [setCookie, removeCookie],
  );

  return {
    showNewSiteToggle,
    preferNewSite,
    setPreferNewSite,
  };
};
