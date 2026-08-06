import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { formatDateRange } from "@/lib/formatHelpers";
import BannerDescription from "./BannerDescription";
import CloudinaryImage from "../CloudinaryImage";
import Type from "../Type";

export default function BasicBanner({
  event,
}: Readonly<{
  event: ForumEventBase;
}>) {
  const { title, startDate, endDate, bannerImageId } = event;
  const date = endDate ? formatDateRange(startDate, endDate) : null;
  return (
    <AnalyticsContext pageSectionContext="forumEventFrontpageBannerBasic">
      <div
        data-component="BasicBanner"
        className="
          h-45 flex flex-col justify-center
          bg-[linear-gradient(90deg,var(--event-bg)_0%,var(--event-bg)_30%,black_50%)]
        "
      >
        <div className="max-w-120 p-8">
          {date && <Type>{date}</Type>}
          <Type>{title}</Type>
          <BannerDescription event={event} />
        </div>
        {bannerImageId && (
          <CloudinaryImage
            publicId={bannerImageId}
            className="
              absolute z-[-1] inset-0 w-full min-w-125 h-full object-cover object-top
            "
          />
        )}
        {/*
        <ForumIcon icon="Close" onClick={dismiss} className={classes.hideButton} />
          */}
      </div>
    </AnalyticsContext>
  );
}
