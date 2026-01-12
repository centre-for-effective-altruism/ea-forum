"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCookies } from "react-cookie";
import stringify from "json-stringify-deterministic";
import { useTracking } from "../analyticsEvents";
import { nYearsFromNow, secondsAgo } from "../timeUtils";
import { cookiePreferencesChanged } from "./cookieCallbacks";
import {
  getExplicitConsentRequiredAsync,
  getExplicitConsentRequiredSync,
} from "./consentRequired";
import {
  ALL_COOKIES,
  CookieName,
  CookieType,
  isValidCookieTypeArray,
  ONLY_NECESSARY_COOKIES,
} from "./cookies";

const PREFERENCES_COOKIE_DURATION_YEARS = 2;

/**
 * Global variable storing the last time the cookie preferences were updated
 * automatically, to prevent several instances of this hook from updating the
 * cookie preferences at the same time.
 */
let cookiePreferencesAutoUpdatedTime: Date | null = null;

/**
 * Fetches the current cookie preferences and allows the user to update them.
 *
 * IMPORTANT NOTE: getCookiePreferences in ./cookies.ts should mirror the
 * behaviour here (at least the parts that get cookiePreferences and
 * explicitConsentGiven). If you make a change here, make sure to update that
 * function too.
 */
export function useCookiePreferences(): {
  cookiePreferences: CookieType[];
  updateCookiePreferences: (newPreferences: CookieType[]) => void;
  explicitConsentGiven: boolean;
  explicitConsentRequired: boolean | "unknown";
} {
  const { captureEvent } = useTracking();
  const [explicitConsentRequired, setExplicitConsentRequired] = useState<
    boolean | "unknown"
  >(getExplicitConsentRequiredSync());

  const preferencesCookieName: CookieName = "cookie_preferences";
  const consentTimeCookieName: CookieName = "cookie_consent_timestamp";
  const [cookies, setCookie] = useCookies([
    preferencesCookieName,
    consentTimeCookieName,
  ]);
  const preferencesCookieValue = cookies[preferencesCookieName];
  const explicitConsentGiven =
    !!cookies[consentTimeCookieName] &&
    isValidCookieTypeArray(preferencesCookieValue);

  const fallbackPreferences: CookieType[] = useMemo(
    () => (explicitConsentRequired !== false ? ONLY_NECESSARY_COOKIES : ALL_COOKIES),
    [explicitConsentRequired],
  );
  const cookiePreferences = explicitConsentGiven
    ? preferencesCookieValue
    : fallbackPreferences;

  const stringFallbackPreferences = stringify(fallbackPreferences);
  const stringPreferencesCookieValue = stringify(preferencesCookieValue);

  // If we can't determine whether explicit consent is required synchronously
  // (from localStorage), check via the geolocation API
  useEffect(() => {
    if (explicitConsentRequired !== "unknown") {
      return;
    }

    void (async () => {
      const explicitConsentRequired = await getExplicitConsentRequiredAsync();
      setExplicitConsentRequired(explicitConsentRequired);
    })();
  }, [explicitConsentRequired]);

  // If the user had not given explicit consent, but the value of
  // COOKIE_PREFERENCES_COOKIE is different to what we are using in the code
  // (fallbackPreferences), update the cookie. This is so that Google Tag
  // Manager handles it correctly.
  useEffect(() => {
    const canAutoUpdate =
      cookiePreferencesAutoUpdatedTime === null ||
      secondsAgo(cookiePreferencesAutoUpdatedTime) > 30;
    if (
      !canAutoUpdate ||
      explicitConsentRequired === "unknown" ||
      explicitConsentGiven
    ) {
      return;
    }

    if (stringFallbackPreferences !== stringPreferencesCookieValue) {
      cookiePreferencesAutoUpdatedTime = new Date();
      setCookie("cookie_preferences", cookiePreferences, {
        path: "/",
        expires: nYearsFromNow(PREFERENCES_COOKIE_DURATION_YEARS),
      });
      cookiePreferencesChanged({
        cookiePreferences,
        explicitlyChanged: false,
      });
    }
  }, [
    explicitConsentGiven,
    explicitConsentRequired,
    stringFallbackPreferences,
    stringPreferencesCookieValue,
    cookiePreferences,
    setCookie,
  ]);

  const updateCookiePreferences = useCallback(
    (newPreferences: CookieType[]) => {
      captureEvent("cookiePreferencesUpdated", {
        cookiePreferences: newPreferences,
      });
      setCookie("cookie_consent_timestamp", new Date(), {
        path: "/",
        expires: nYearsFromNow(PREFERENCES_COOKIE_DURATION_YEARS),
      });
      setCookie("cookie_preferences", newPreferences, {
        path: "/",
        expires: nYearsFromNow(PREFERENCES_COOKIE_DURATION_YEARS),
      });
      cookiePreferencesChanged({
        cookiePreferences: newPreferences,
        explicitlyChanged: true,
      });
    },
    [captureEvent, setCookie],
  );

  return {
    cookiePreferences,
    updateCookiePreferences,
    explicitConsentGiven,
    explicitConsentRequired,
  };
}
