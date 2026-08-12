import type { ReactNode } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import Nav from "../Nav/Nav";

export default function HomePageColumns({
  pageContext,
  banner,
  children,
}: Readonly<{
  pageContext: string;
  banner?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <AnalyticsContext pageContext={pageContext}>
      <div data-component="HomePageColumns">
        {banner}
        <div
          className="
            max-mobile-nav:block max-mobile-nav:w-[780px]
            grid grid-cols-[min-content_1fr] justify-between gap-10
            max-w-full mx-auto px-2 py-4 sm:p-4 md:p-8
          "
        >
          <Nav className="max-mobile-nav:hidden sticky top-[98px] self-start" />
          <div className="w-full min-w-0 max-w-[1200px] mx-auto">{children}</div>
        </div>
      </div>
    </AnalyticsContext>
  );
}
