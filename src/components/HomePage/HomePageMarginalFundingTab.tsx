import { AnalyticsContext } from "@/lib/analyticsEvents";

export default function HomePageMarginalFundingTab() {
  return (
    <AnalyticsContext homePageTab="marginalFunding">
      <div data-component="HomePageMarginalFundingTab" className="pb-20" />
    </AnalyticsContext>
  );
}
