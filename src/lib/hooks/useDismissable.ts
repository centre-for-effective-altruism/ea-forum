import { useCallback, useState } from "react";
import { nMonthsAgo } from "../timeUtils";
import { useTracking } from "../../lib/analyticsEvents";
import { useCookiesWithConsent } from "../cookies/useCookiesWithConsent";
import type { CookieName } from "../cookies/cookies";

export const useDismissable = (
  /**
   * The name of the cookie to store the dismissed state. This should be
   * created with `registerCookie`.
   */
  cookieName: CookieName,
  /**
   * The duration for how long the dismissed state should be stored in months.
   */
  dismissDurationMonths = 120,
) => {
  const { captureEvent } = useTracking();
  const [cookies, setCookie] = useCookiesWithConsent([cookieName]);
  const [dismissed, setDismissed] = useState(cookies[cookieName] === "true");
  const dismiss = useCallback(() => {
    // Setting the state separately means that we can still dismiss even if the
    // user hasn't enabled cookies (though the preference won't be saved)
    setDismissed(true);
    setCookie(cookieName, "true", {
      expires: nMonthsAgo(-dismissDurationMonths),
    });
    captureEvent(`dismissed_${cookieName}`);
  }, [cookieName, dismissDurationMonths, setCookie, captureEvent]);
  return {
    dismissed,
    dismiss,
  };
};
