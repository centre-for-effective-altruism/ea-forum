"use client";

import { useCallback } from "react";
import { useCookies } from "react-cookie";
import { CookieSetOptions } from "universal-cookie";
import { CookieName, isCookieAllowed } from "./cookies";
import { useCookiePreferences } from "./useCookiePreferences";

export const useCookiesWithConsent = <
  T extends CookieName,
  Cookies = { [K in T]?: string },
>(
  dependencies?: T[],
): [
  Cookies,
  (name: T, value: string, options?: CookieSetOptions) => void,
  (name: T, options?: CookieSetOptions) => void,
] => {
  const { cookiePreferences } = useCookiePreferences();

  const [cookies, setCookieBase, removeCookieBase] = useCookies<T, Cookies>(
    dependencies,
    { doNotParse: true },
  );

  const setCookie = useCallback(
    (name: T, value: string, options?: CookieSetOptions) => {
      if (!isCookieAllowed(name, cookiePreferences)) {
        console.warn(`Consent has not been granted for cookie "${name}" to be set`);
        return;
      }

      setCookieBase(name, value, options);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(cookiePreferences), setCookieBase],
  );

  return [cookies, setCookie, removeCookieBase];
};
