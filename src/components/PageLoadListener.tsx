"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { devicePrefersDarkMode } from "@/lib/hooks/usePrefersDarkMode";
import { initGoogleTagManager } from "@/lib/googleTagManager";
import { getBrowserProperties } from "@/lib/environment";
import { useTracking } from "@/lib/analyticsEvents";
import { initRecaptcha } from "@/lib/recaptcha";

let lastUrl: string | null = null;

export default function PageLoadListener() {
  const { captureEvent } = useTracking();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;

  /**
   * Effects that should trigger exactly once after the initial page load, and
   * not again on client-side navigations.
   */
  useEffect(() => {
    initGoogleTagManager();
    void initRecaptcha();

    // This cookie is no longer used and is very large - delete it
    document.cookie = "ea_forum_v3_owned_routes=; Max-Age=0; path=/";

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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Effects that should trigger on each page load, including client-side
   * navigations
   */
  useEffect(() => {
    if (url !== lastUrl) {
      // Don't send the callback on the initial pageload, only on post-load
      // navigations
      if (lastUrl) {
        captureEvent("navigate", {
          from: lastUrl,
          to: url,
        });
      }
      lastUrl = url;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return null;
}
