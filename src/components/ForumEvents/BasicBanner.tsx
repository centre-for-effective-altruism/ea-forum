import { AnalyticsContext } from "@/lib/analyticsEvents";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { formatDateRange } from "@/lib/formatHelpers";
import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import BannerDescription from "./BannerDescription";
import CloudinaryImage from "../CloudinaryImage";
import MaybeLink from "../MaybeLink";
import Type from "../Type";

export default function BasicBanner({
  event,
  onDismiss,
}: Readonly<{
  event: ForumEventBase;
  onDismiss?: () => void;
}>) {
  const { title, post, startDate, endDate, bannerImageId } = event;
  const date = endDate ? formatDateRange(startDate, endDate) : null;
  return (
    <AnalyticsContext pageSectionContext="forumEventFrontpageBannerBasic">
      <div
        data-component="BasicBanner"
        className="
          relative h-45 flex flex-col justify-center
        "
      >
        {bannerImageId && (
          <div
            aria-hidden
            className="
              absolute z-0 inset-0 w-full h-full hidden md:block pointer-events-none
            "
          >
            <CloudinaryImage
              publicId={bannerImageId}
              className="
                absolute z-0 inset-0 w-full min-w-125 h-full object-cover object-top
              "
            />
            <div
              className="
                absolute z-1 inset-0 w-full h-full
                bg-[linear-gradient(90deg,var(--event-bg)_0%,var(--event-bg)_30%,transparent_50%)]
              "
            />
          </div>
        )}
        <div className="relative z-2 max-w-120 p-8 flex flex-col gap-1">
          {date && <Type style="bodyMedium">{date}</Type>}
          <Type style="bannerTitle">
            <MaybeLink href={post ? postGetPageUrl({ post }) : null}>
              {title}
            </MaybeLink>
          </Type>
          <BannerDescription event={event} />
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="
              absolute z-2 top-2 right-2 cursor-pointer opacity-70 hover:opacity-100
            "
          >
            <XMarkIcon className="w-4" />
          </button>
        )}
      </div>
    </AnalyticsContext>
  );
}
