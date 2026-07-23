import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookieName } from "@/lib/cookies/cookies";

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
  cookies: ReadonlyRequestCookies,
): HomePageTabName => {
  const cookie = cookies.get(homePageTabCookie);
  if (cookie?.value) {
    for (const { name } of homePageTabs) {
      if (name === cookie.value) {
        return name;
      }
    }
  }
  return homePageTabs[0].name;
};
