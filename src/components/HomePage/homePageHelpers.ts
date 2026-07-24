import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { CookieName, cookieName } from "@/lib/cookies/cookies";

export const homePageTabs = [
  {
    label: "Featured",
    name: "featured",
  },
  {
    label: "New & upvoted",
    name: "magic",
  },
] as const;

export type HomePageTabName = (typeof homePageTabs)[number]["name"];

export const homePageTabCookie = cookieName("last_frontpage_tab");

export const getCurrentHomePageTab = (
  cookies: ReadonlyRequestCookies | Partial<Record<CookieName, string>>,
): HomePageTabName => {
  const cookie =
    "get" in cookies
      ? cookies.get(homePageTabCookie)?.value
      : cookies[homePageTabCookie];
  if (cookie) {
    for (const { name } of homePageTabs) {
      if (name === cookie) {
        return name;
      }
    }
  }
  return homePageTabs[0].name;
};
