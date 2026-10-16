import type { HomePageTabName } from "./homePageHelpers";
import HomePageFeaturedRoute from "./HomePageFeaturedRoute";
import HomePageMagicRoute from "./HomePageMagicRoute";

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
    default:
      console.error("Invalid home page tab name:", tab);
      return null;
  }
}
