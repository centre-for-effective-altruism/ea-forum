"use client";

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { useCookiesWithConsent } from "@/lib/cookies/useCookiesWithConsent";
import { useTracking } from "@/lib/analyticsEvents";
import {
  HomePageTabName,
  getCurrentHomePageTab,
  homePageTabCookie,
} from "./homePageHelpers";

type HomePageTabContext = {
  currentTab: HomePageTabName;
  setCurrentTab: (tab: HomePageTabName) => void;
};

const homePageTabContext = createContext<HomePageTabContext | null>(null);

export const HomePageTabProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { captureEvent } = useTracking();
  const [cookies, setCookie] = useCookiesWithConsent([homePageTabCookie]);
  const initialTab = getCurrentHomePageTab(cookies);
  const [currentTab, rawSetCurrentTab] = useState<HomePageTabName>(initialTab);

  const setCurrentTab = useCallback(
    (tab: HomePageTabName) => {
      rawSetCurrentTab(tab);
      setCookie(homePageTabCookie, tab);
      captureEvent("setFrontpageTab", { tab });
    },
    [setCookie, captureEvent],
  );

  return (
    <homePageTabContext.Provider
      value={{
        currentTab,
        setCurrentTab,
      }}
    >
      {children}
    </homePageTabContext.Provider>
  );
};

export const useHomePageTab = () => {
  const context = useContext(homePageTabContext);
  if (!context) {
    throw new Error("No home page context found");
  }
  return context;
};
