import { getCookiePreferences } from "./cookies/cookies";
import { isServer } from "./environment";

let reCaptchaInitialized = false;

/**
 * Check for cookie preferences and initialize ReCaptcha if analytics cookies
 * are allowed. Unfortunately checking for cookie preferences makes it a lot
 * less useful for preventing spam, but it will still work outside GDPR
 * countries at least.
 */
export const initRecaptcha = async () => {
  if (isServer || reCaptchaInitialized) {
    return;
  }

  const { cookiePreferences } = await getCookiePreferences();

  const analyticsCookiesAllowed = cookiePreferences.includes("analytics");

  if (!analyticsCookiesAllowed) {
    console.warn("Not initializing ReCaptcha: analytics cookies not allowed");
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY;
  if (!apiKey) {
    console.warn("Not initializing ReCaptcha: no API key");
    return;
  }

  const script = document.createElement("script");
  script.src = `https://www.google.com/recaptcha/api.js?render=${apiKey}`;
  document.body.appendChild(script);

  reCaptchaInitialized = true;
};
