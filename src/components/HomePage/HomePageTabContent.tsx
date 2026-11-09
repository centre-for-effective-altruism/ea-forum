import type { HomePageTabName } from "./homePageHelpers";
import HomePageFeaturedRoute from "./HomePageFeaturedRoute";
import HomePageMagicRoute from "./HomePageMagicRoute";
import HomePageMarginalFundingTab from "./HomePageMarginalFundingTab";

export default function HomePageTabContent({
  tab,
}: Readonly<{
  tab: HomePageTabName;
}>) {
  switch (tab) {
    case "featured":
      return <HomePageFeaturedRoute />;
    case "magic":
      return <HomePageMagicRoute />;
    case "marginalFunding":
      return <HomePageMarginalFundingTab />;
    default:
      console.error("Invalid home page tab name:", tab);
      return null;
  }
}
