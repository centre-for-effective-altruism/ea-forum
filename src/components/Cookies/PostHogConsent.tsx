"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { useCookiePreferences } from "@/lib/cookies/useCookiePreferences";

export default function PostHogConsent() {
  const { cookiePreferences, explicitConsentGiven, explicitConsentRequired } =
    useCookiePreferences();
  const consentKnown = explicitConsentGiven || explicitConsentRequired !== "unknown";
  const analyticsAllowed = cookiePreferences.includes("analytics");

  useEffect(() => {
    if (!consentKnown) {
      return;
    }
    const consentStatus = posthog.get_explicit_consent_status();
    if (analyticsAllowed && consentStatus !== "granted") {
      posthog.opt_in_capturing({ captureEventName: false });
    } else if (!analyticsAllowed && consentStatus !== "denied") {
      posthog.opt_out_capturing();
    }
  }, [consentKnown, analyticsAllowed]);

  return null;
}
