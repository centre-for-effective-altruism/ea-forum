import { Suspense } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getIntroCourseDetails } from "@/lib/introCourseDetails";
import clsx from "clsx";
import HomeSidebarOpportunitiesList from "./HomeSidebarOpportunitiesList";
import HomeSidebarEventsList from "./HomeSidebarEventsList";
import HomeSidebarPostsListSkeleton from "./HomeSidebarPostsListSkeleton";
import HomeSidebarDigestAd from "./HomeSidebarDigestAd";
import HomeSidebarCourse from "./HomeSidebarCourse";
import Type from "../../Type";
import Link from "../../Link";

export default function HomeSidebar({
  className,
}: Readonly<{ className?: string }>) {
  const introCourse = getIntroCourseDetails();
  return (
    <AnalyticsContext pageSectionContext="homeRhs">
      <section className={clsx("w-[260px]", className)} data-component="HomeSidebar">
        <HomeSidebarDigestAd className="mb-6" />

        <AnalyticsContext pageSubSectionContext="opportunities">
          <Type style="sectionTitleSmall" className="mb-2">
            <Link href="/topics/opportunities-to-take-action?sortedBy=magic">
              Opportunities
            </Link>
          </Type>
          <div className="mb-6">
            <Suspense fallback={<HomeSidebarPostsListSkeleton count={3} />}>
              <HomeSidebarOpportunitiesList count={3} />
            </Suspense>
          </div>
        </AnalyticsContext>

        <AnalyticsContext pageSubSectionContext="upcomingEvents">
          <Type style="sectionTitleSmall" className="mb-2">
            <Link href="/events">Upcoming events</Link>
          </Type>
          <div className="mb-6">
            <Suspense fallback={<HomeSidebarPostsListSkeleton count={3} />}>
              <HomeSidebarEventsList count={3} />
            </Suspense>
          </div>
        </AnalyticsContext>

        <AnalyticsContext pageSubSectionContext="courses">
          <Type style="sectionTitleSmall" className="mb-2">
            <Link href="/virtual-programs?utm_source=ea_forum&utm_medium=rhs&utm_campaign=home_page">
              Online courses
            </Link>
          </Type>
          <div className="mb-6">
            <HomeSidebarCourse
              title="The Introductory EA Program"
              href="https://www.effectivealtruism.org/virtual-programs/introductory-program?utm_source=ea_forum&utm_medium=rhs&utm_campaign=home_page"
              applicationDeadline={introCourse.deadline}
              startDate={introCourse.start}
            />
          </div>
        </AnalyticsContext>

        <Type style="body" className="font-[600] text-gray-600">
          <Link href="mailto:forum@effectivealtruism.org">Send feedback</Link>
        </Type>
      </section>
    </AnalyticsContext>
  );
}
