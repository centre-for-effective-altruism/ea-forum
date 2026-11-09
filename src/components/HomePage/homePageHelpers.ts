import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { CookieName, cookieName } from "@/lib/cookies/cookies";
import { marginalFundingEvent } from "@/lib/sequences/sequenceEvents";

export const homePageTabs = [
  {
    label: "Featured",
    name: "featured",
  },
  {
    label: "New & upvoted",
    name: "magic",
  },
  {
    label: "Marginal Funding Week",
    name: "marginalFunding",
    activeColor: marginalFundingEvent.themeColor,
  },
] as const;

export type HomePageTabName = (typeof homePageTabs)[number]["name"];

export const homePageTabCookie = cookieName("last_frontpage_tab");

export const preMarginalFundingHomePageTabCookie = cookieName(
  "pre_marginal_funding_frontpage_tab",
);

const isHomePageTabName = (value?: string | null): value is HomePageTabName =>
  !!value && homePageTabs.some(({ name }) => name === value);

export const getCurrentHomePageTab = (
  cookies: ReadonlyRequestCookies | Partial<Record<CookieName, string>>,
): HomePageTabName => {
  const cookie =
    "get" in cookies
      ? cookies.get(homePageTabCookie)?.value
      : cookies[homePageTabCookie];
  if (cookie && isHomePageTabName(cookie)) {
    return cookie;
  }
  return homePageTabs[0].name;
};
