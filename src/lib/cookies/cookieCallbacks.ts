import Cookies from "universal-cookie";
import stringify from "json-stringify-deterministic";
import { initRecaptcha } from "../recaptcha";
import { ALL_COOKIES, CookieName, CookieType, isCookieAllowed } from "./cookies";

type CookiePreferencesChangedCallbackProps = {
  cookiePreferences: CookieType[];
  explicitlyChanged: boolean;
};

/**
 * (Re)-initialise ReCaptcha, etc. with the current cookie preferences.
 */
export const cookiePreferencesChanged = ({
  cookiePreferences,
  explicitlyChanged,
}: CookiePreferencesChangedCallbackProps) => {
  void initRecaptcha();

  // Send a cookie_preferences_changed event to Google Tag Manager, which
  // triggers google analytics and hotjar to start
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataLayer = (window as any).dataLayer;
  if (!dataLayer) {
    console.warn("Trying to call gtag before dataLayer has been initialized");
  } else {
    dataLayer.push({ event: "cookie_preferences_changed" });
  }

  // Remove all cookies that are not allowed. Don't try to remove any cookies if:
  // - all cookies are allowed
  // - this change was not explicitly made by the user (i.e. it was made based on
  //   their location)
  if (
    !explicitlyChanged ||
    stringify(cookiePreferences) === stringify(ALL_COOKIES)
  ) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log("Removing cookies that are not allowed");

  // remove all cookies that are not allowed
  const cookies = new Cookies();
  for (const cookieName in cookies.getAll()) {
    if (!isCookieAllowed(cookieName as CookieName, cookiePreferences)) {
      cookies.remove(cookieName);
    }
  }
};
