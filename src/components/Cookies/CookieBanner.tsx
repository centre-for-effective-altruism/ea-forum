"use client";

import { useCallback } from "react";
import { ALL_COOKIES, ONLY_NECESSARY_COOKIES } from "@/lib/cookies/cookies";
import { useCookiePreferences } from "@/lib/cookies/useCookiePreferences";
import CookiePopoverLink from "./CookiePopoverLink";
import Button from "../Button";
import Link from "../Link";
import Type from "../Type";

export default function CookieBanner() {
  const { explicitConsentGiven, explicitConsentRequired, updateCookiePreferences } =
    useCookiePreferences();

  const onReject = useCallback(() => {
    updateCookiePreferences(ONLY_NECESSARY_COOKIES);
  }, [updateCookiePreferences]);

  const onAccept = useCallback(() => {
    updateCookiePreferences(ALL_COOKIES);
  }, [updateCookiePreferences]);

  if (explicitConsentRequired !== true || explicitConsentGiven) {
    return null;
  }

  return (
    <section
      data-component="CookieBanner"
      className="
        fixed bottom-0 left-0 w-full z-(--zindex-cookie-banner) p-4 shadow
        bg-gray-0 border-t border-gray-200
      "
    >
      <div className="w-[1200px] max-w-full mx-auto flex gap-2 items-center">
        <Type
          className="
            [&_a]:underline [&_a]:hover:opacity-70 [&_a]:cursor-pointer
            [&_a]:font-[600]
          "
        >
          We and our partners use cookies, including to review how our site is used
          and to improve our site&apos;s performance. By clicking &quot;Accept
          all&quot; you agree to their use. Customise your{" "}
          <CookiePopoverLink>cookie settings</CookiePopoverLink> for more control, or
          review our <Link href="/cookie-policy">cookie policy</Link> here.
        </Type>
        <div className="flex gap-2 items-center [&_*]:whitespace-nowrap">
          <Button variant="greyFilled" onClick={onReject}>
            Reject
          </Button>
          <Button variant="primaryFilled" onClick={onAccept}>
            Accept all
          </Button>
        </div>
      </div>
    </section>
  );
}
