import { AnalyticsContext, AnalyticsInViewTracker } from "@/lib/analyticsEvents";
import Type from "../Type";

export default function HomeSidebarDigestAd({ className = "" }: Readonly<{
  className?: string,
}>) {
  // TODO: This needs a lot of logic when auth is working - see useDigestAd
  return (
    <AnalyticsContext pageSubSectionContext="digestAd">
      <AnalyticsInViewTracker eventProps={{inViewType: "sidebarDigestAd"}}>
        <div
          className={`bg-gray-200 px-4 py-3 rounded ${className}`}
          data-component="HomeSidebarDigestAd"
        >
          <Type className="font-[600] text-[16px] mb-2">
            Sign up for the weekly EA Forum Digest
          </Type>
          <Type className="text-gray-600 leading-[18px] mb-2">
            A curated reading list of Forum posts, every Wednesday
          </Type>
        </div>
      </AnalyticsInViewTracker>
    </AnalyticsContext>
  );
}
