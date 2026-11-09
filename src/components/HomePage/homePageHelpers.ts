import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { CookieName, cookieName } from "@/lib/cookies/cookies";
import {
  marginalFundingWeekEnabled,
  marginalFundingWeekThemeColor,
} from "@/lib/marginalFundingWeek";

const allHomePageTabs = [
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
    activeColor: marginalFundingWeekThemeColor,
  },
] as const;

export type HomePageTabName = (typeof allHomePageTabs)[number]["name"];

export const homePageTabs = allHomePageTabs.filter(
  ({ name }) => name !== "marginalFunding" || marginalFundingWeekEnabled,
);

export const homePageTabCookie = cookieName("last_frontpage_tab");

export const preMarginalFundingHomePageTabCookie = cookieName(
  "pre_marginal_funding_frontpage_tab",
);

const isHomePageTabName = (value?: string | null): value is HomePageTabName =>
  !!value && homePageTabs.some(({ name }) => name === value);

export const getCurrentHomePageTab = (
  cookies: ReadonlyRequestCookies | Partial<Record<CookieName, string>>,
): HomePageTabName => {
  const getCookie = (name: CookieName) =>
    "get" in cookies ? cookies.get(name)?.value : cookies[name];
  const lastTab = getCookie(homePageTabCookie);
  if (isHomePageTabName(lastTab)) {
    return lastTab;
  }
  const preMarginalFundingTab = getCookie(preMarginalFundingHomePageTabCookie);
  if (isHomePageTabName(preMarginalFundingTab)) {
    return preMarginalFundingTab;
  }
  return homePageTabs[0].name;
};
