import type { ReactNode } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import HomeSidebar from "./HomeSidebar/HomeSidebar";
import Nav from "../Nav/Nav";

export default async function HomePageColumns({
  pageContext,
  children,
}: Readonly<{
  pageContext: string;
  children: ReactNode;
}>) {
  return (
    <AnalyticsContext pageContext={pageContext}>
      <div
        data-component="HomePageColumns"
        className="
          max-mobile-nav:block max-mobile-nav:w-[780px]
          grid grid-cols-[min-content_780px_min-content] justify-between
          max-w-full mx-auto px-2 py-4 sm:p-4 md:p-8
        "
      >
        <Nav className="max-mobile-nav:hidden sticky top-[98px] self-start" />
        <div>{children}</div>
        <HomeSidebar className="max-hide-sidebar:hidden sticky top-[98px] self-start" />
      </div>
    </AnalyticsContext>
  );
}
