import type { ReactNode } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import Nav from "../Nav/Nav";

export default function HomePageColumns({
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
          grid grid-cols-[min-content_1fr] justify-between gap-10
          max-w-full mx-auto px-2 py-4 sm:p-4 md:p-8
        "
      >
        <Nav className="max-mobile-nav:hidden sticky top-[98px] self-start" />
        <div className="w-full max-w-[1500px] mx-auto">{children}</div>
      </div>
    </AnalyticsContext>
  );
}
