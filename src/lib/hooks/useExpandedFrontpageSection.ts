import { useState, useCallback, useEffect } from "react";
import { rpc } from "../rpc";
import { useTracking } from "../../lib/analyticsEvents";
import { useCookiesWithConsent } from "../cookies/useCookiesWithConsent";
import { nYearsFromNow } from "../timeUtils";
import { useCurrentUser } from "./useCurrentUser";
import type { CurrentUser } from "../users/currentUser";
import type { CookieName } from "../cookies/cookies";

export type DefaultExpandedType =
  | "all"
  | "none"
  | "loggedIn"
  | "loggedOut"
  | ((currentUser: CurrentUser | null) => boolean);

export type UseExpandedFrontpageSectionProps = {
  section: string;
  defaultExpanded: DefaultExpandedType;
  onExpandEvent?: string;
  onCollapseEvent?: string;
  cookieName: CookieName;
  forceSetCookieIfUndefined?: boolean;
};

const isDefaultExpanded = (
  currentUser: CurrentUser | null,
  defaultExpanded: DefaultExpandedType,
): boolean => {
  if (typeof defaultExpanded === "function") {
    return defaultExpanded(currentUser);
  }
  switch (defaultExpanded) {
    case "none":
      return false;
    case "all":
      return true;
    case "loggedIn":
      return !!currentUser;
    case "loggedOut":
      return !currentUser;
  }
};

const isInitialExpanded = (
  section: string,
  defaultExpanded: DefaultExpandedType,
  currentUser: CurrentUser | null,
  cookies: Record<string, string>,
  cookieName: CookieName,
): boolean => {
  if (cookies[cookieName]) {
    return cookies[cookieName] === "true";
  }
  const userExpand = currentUser?.expandedFrontpageSections?.[section];
  if (typeof userExpand === "boolean") {
    return userExpand;
  }
  return isDefaultExpanded(currentUser, defaultExpanded);
};

export const useExpandedFrontpageSection = ({
  section,
  defaultExpanded,
  onExpandEvent,
  onCollapseEvent,
  cookieName,
  forceSetCookieIfUndefined,
}: UseExpandedFrontpageSectionProps) => {
  const { currentUser } = useCurrentUser();
  const { captureEvent } = useTracking();
  const [cookies, setCookie] = useCookiesWithConsent([cookieName]);
  const [expanded, setExpanded] = useState(() =>
    isInitialExpanded(section, defaultExpanded, currentUser, cookies, cookieName),
  );

  const saveToCookie = useCallback(
    (value: boolean) => {
      if (cookieName) {
        setCookie(cookieName, String(value), {
          expires: nYearsFromNow(10),
        });
      }
    },
    [setCookie, cookieName],
  );

  const toggleExpanded = useCallback(() => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (currentUser) {
      void rpc.users.updateExpandedSection({
        section,
        expanded: newExpanded,
      });
    }
    saveToCookie(newExpanded);
    const event = newExpanded ? onExpandEvent : onCollapseEvent;
    if (event) {
      captureEvent(event);
    }
  }, [
    section,
    onExpandEvent,
    onCollapseEvent,
    expanded,
    currentUser,
    captureEvent,
    saveToCookie,
  ]);

  useEffect(() => {
    if (forceSetCookieIfUndefined && !cookies[cookieName]) {
      saveToCookie(expanded);
    }
  }, [forceSetCookieIfUndefined, cookies, cookieName, saveToCookie, expanded]);

  return {
    expanded,
    toggleExpanded,
  };
};
