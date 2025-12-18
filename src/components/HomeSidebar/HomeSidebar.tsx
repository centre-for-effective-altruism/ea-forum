import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getIntroCourseDetails } from "@/lib/introCourseDetails";
import {
  fetchSidebarEvents,
  fetchSidebarOpportunities,
} from "@/lib/posts/postLists";
import HomeSidebarDigestAd from "./HomeSidebarDigestAd";
import HomeSidebarPost from "./HomeSidebarPost";
import HomeSidebarEvent from "./HomeSidebarEvent";
import HomeSidebarCourse from "./HomeSidebarCourse";
import Type from "../Type";
import Link from "../Link";

export default async function HomeSidebar() {
  const [opportunities, upcomingEvents] = await Promise.all([
    fetchSidebarOpportunities(3),
    fetchSidebarEvents(3),
  ]);
  const introCourse = getIntroCourseDetails();
  return (
    <AnalyticsContext pageSectionContext="homeRhs">
      <section className="w-[310px]" data-component="HomeSidebar">
        <HomeSidebarDigestAd className="mb-6" />

        <AnalyticsContext pageSubSectionContext="opportunities">
          <Type style="sectionTitleSmall" className="mb-2">
            <Link href="/topics/opportunities-to-take-action?sortedBy=magic">
              Opportunities
            </Link>
          </Type>
          <div className="mb-6">
            {opportunities.map((post) => (
              <HomeSidebarPost post={post} key={post._id} />
            ))}
          </div>
        </AnalyticsContext>

        <AnalyticsContext pageSubSectionContext="upcomingEvents">
          <Type style="sectionTitleSmall" className="mb-2">
            <Link href="/events">Upcoming events</Link>
          </Type>
          <div className="mb-6">
            {upcomingEvents.map((post) => (
              <HomeSidebarEvent post={post} key={post._id} />
            ))}
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
