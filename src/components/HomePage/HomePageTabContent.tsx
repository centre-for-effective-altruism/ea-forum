import type { HomePageTabName } from "./homePageHelpers";
import HomePageFeaturedRoute from "./HomePageFeaturedRoute";
import HomePageMagicRoute from "./HomePageMagicRoute";
import HomePageMarginalFundingRoute from "./HomePageMarginalFundingRoute";

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
      return <HomePageMarginalFundingRoute />;
    default:
      console.error("Invalid home page tab name:", tab);
      return null;
  }
}
