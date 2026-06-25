"use client";

import { useEffect } from "react";
import { devicePrefersDarkMode } from "@/lib/hooks/usePrefersDarkMode";
import { CLIENT_ID_COOKIE } from "@/lib/clientIds/clientIdHelpers";
import { initGoogleTagManager } from "@/lib/googleTagManager";
import { getBrowserProperties } from "@/lib/environment";
import { useTracking } from "@/lib/analyticsEvents";
import { initRecaptcha } from "@/lib/recaptcha";
import { randomId } from "@/lib/utils/random";

/**
 * This component handles effects that should trigger exactly once after the
 * initial page load, and not again on client-side navigations.
 */
export default function PageLoadListener() {
  const { captureEvent } = useTracking();

  useEffect(() => {
    if (
      !document.cookie.split("; ").find((row) => row.startsWith(CLIENT_ID_COOKIE))
    ) {
      const clientId = randomId();
      document.cookie = `${CLIENT_ID_COOKIE}=${clientId}; path=/; max-age=315360000`;
    }

    if (!window.tabId) {
      window.tabId = randomId();
    }

    initGoogleTagManager();
    void initRecaptcha();

    const urlParams = new URLSearchParams(document.location?.search);
    captureEvent("pageLoadFinished", {
      url: document.location?.href,
      referrer: document.referrer,
      utmSource: urlParams.get("utm_source"),
      utmMedium: urlParams.get("utm_medium"),
      utmCampaign: urlParams.get("utm_campaign"),
      utmContent: urlParams.get("utm_content"),
      utmTerm: urlParams.get("utm_term"),
      utmUserId: urlParams.get("utm_user_id"),
      browserProps: getBrowserProperties(),
      prefersDarkMode: devicePrefersDarkMode(),
      performance: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        memory: (window as any).performance?.memory?.usedJSHeapSize,
        timeOrigin: window.performance?.timeOrigin,
        timing: window.performance?.timing?.toJSON?.(),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
