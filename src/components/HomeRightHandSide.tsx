import { AnalyticsContext } from "@/lib/analyticsEvents";

export default function HomeRightHandSide() {
  return (
    <AnalyticsContext pageSectionContext="homeRhs">
      <section className="w-[310px]">
        RHS
      </section>
    </AnalyticsContext>
  )
}
