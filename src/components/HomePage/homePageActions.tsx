"use server";

import { HomePageTabName } from "./homePageHelpers";
import HomePageTabContent from "./HomePageTabContent";

export const renderHomePageContentAction = async (tab: HomePageTabName) => (
  <HomePageTabContent tab={tab} />
);
