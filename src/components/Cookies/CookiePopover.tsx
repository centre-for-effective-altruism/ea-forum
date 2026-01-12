"use client";

import { useCallback, useState } from "react";
import { useCookiePreferences } from "@/lib/cookies/useCookiePreferences";
import type { CookieType } from "@/lib/cookies/cookies";
import Popover from "../Popover";
import Link from "../Link";
import Type from "../Type";
import Button from "../Button";
import CookieCategory from "./CookieCategory";

export default function CookiePopover({
  open,
  onClose,
}: Readonly<{
  open: boolean;
  onClose: () => void;
}>) {
  const { cookiePreferences, updateCookiePreferences } = useCookiePreferences();
  const [allowedCookies, setAllowedCookies] =
    useState<CookieType[]>(cookiePreferences);

  const saveAndClose = useCallback(() => {
    updateCookiePreferences(allowedCookies);
    onClose?.();
  }, [allowedCookies, onClose, updateCookiePreferences]);

  return (
    <Popover open={open} onClose={onClose} background="dim" className="w-[600px]">
      <div
        data-component="CookiePopover"
        className="
          flex flex-col gap-4
          [&_a]:cursor-pointer [&_a]:text-primary [&_a]:hover:opacity-50
        "
      >
        <Type style="sectionTitleLarge">Cookie settings</Type>
        <Type>
          We use cookies to improve your experience while you navigate through the
          website. Necessary cookies are always stored in your browser as they are
          essential for the basic functionality of the website. We also use cookies
          for non-essential purposes such as remembering your preferences between
          visits, or for analytics. These cookies will be stored in your browser only
          with your consent. Read our full cookie policy{" "}
          <Link href="/cookie-policy">here</Link>.
        </Type>
        <Type>
          If you have previously accepted cookies and are now rejecting them, you are
          responsible for removing any that have already been set. You can do so by
          refreshing the page and then following the instructions{" "}
          <Link href="https://support.google.com/chrome/answer/95647">here</Link>.
        </Type>
        <CookieCategory
          title="Necessary"
          cookieType="necessary"
          allowedCookies={allowedCookies}
          setAllowedCookies={setAllowedCookies}
          alwaysEnabled
        />
        <CookieCategory
          title="Functional"
          cookieType="functional"
          allowedCookies={allowedCookies}
          setAllowedCookies={setAllowedCookies}
        />
        <CookieCategory
          title="Analytics"
          cookieType="analytics"
          allowedCookies={allowedCookies}
          setAllowedCookies={setAllowedCookies}
        />
        <Button variant="primaryFilled" onClick={saveAndClose}>
          Save preferences
        </Button>
      </div>
    </Popover>
  );
}
