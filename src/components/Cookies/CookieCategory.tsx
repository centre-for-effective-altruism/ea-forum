"use client";

import { useCallback, useMemo, useState } from "react";
import { getUniqueCookieProviders, CookieType } from "@/lib/cookies/cookies";
import clsx from "clsx";
import ThickChevronDownIcon from "../Icons/ThickChevronDownIcon";
import ThickChevronRightIcon from "../Icons/ThickChevronRightIcon";
import Checkbox from "../Forms/Checkbox";
import CookieTable from "./CookieTable";
import Type from "../Type";

const cookieTypeExplanations: Record<CookieType, string> = {
  necessary:
    "Necessary cookies are essential for the website to function properly. These cookies ensure basic functionalities and security features of the website, anonymously. In general these cookies expire after 24 months.",
  functional:
    "Functional cookies are not strictly necessary but help to perform certain functionalities, such as allowing you to contact us via Intercom. In general these cookies expire after 24 months.",
  analytics:
    "Analytics cookies are used to understand how visitors interact with the website. These cookies help provide information on metrics the number of visitors, bounce rate, traffic source, etc. In general these cookies expire after 24 months.",
};

export default function CookieCategory({
  title,
  cookieType,
  allowedCookies,
  setAllowedCookies,
  alwaysEnabled,
}: Readonly<{
  title: string;
  cookieType: CookieType;
  allowedCookies: CookieType[];
  setAllowedCookies: (cookies: CookieType[]) => void;
  alwaysEnabled?: boolean;
}>) {
  const [open, setOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setOpen((open) => !open);
  }, []);

  const checked = useMemo(
    () => allowedCookies.includes(cookieType),
    [allowedCookies, cookieType],
  );

  const toggleCookie = useCallback(() => {
    if (alwaysEnabled) {
      return;
    }
    if (checked) {
      setAllowedCookies(allowedCookies.filter((c) => c !== cookieType));
    } else {
      setAllowedCookies([...allowedCookies, cookieType]);
    }
  }, [alwaysEnabled, checked, setAllowedCookies, allowedCookies, cookieType]);

  const explanation = cookieTypeExplanations[cookieType];
  const uniqueProviders = getUniqueCookieProviders(cookieType);
  const Icon = open ? ThickChevronDownIcon : ThickChevronRightIcon;

  return (
    <article data-component="CookieCategory">
      <div
        className="
          h-[48px] flex items-center justify-between bg-gray-100 rounded px-2
          select-none
        "
      >
        <div
          role="button"
          onClick={toggleOpen}
          className="flex items-center cursor-pointer"
        >
          <Icon className="w-4" />
          <Type>{title}</Type>
        </div>
        {alwaysEnabled ? (
          <Type className="italic">always enabled</Type>
        ) : (
          <Checkbox checked={checked} onChange={toggleCookie} />
        )}
      </div>
      <div
        className={clsx(
          "transition-all",
          open ? "max-h-[200px] overflow-auto" : "max-h-[0] overflow-hidden",
        )}
      >
        <Type className="px-2">{explanation}</Type>
        {uniqueProviders.map((name) => (
          <CookieTable
            type={cookieType}
            thirdPartyName={name}
            key={`${cookieType}_${name}`}
          />
        ))}
      </div>
    </article>
  );
}
