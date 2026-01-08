import type { ReactNode } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import HomeSidebar from "./HomeSidebar/HomeSidebar";
import Column from "../Column";
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
      <Column
        className="grid grid-cols-[min-content_780px_min-content] gap-10 p-8"
        data-component="HomePageColumns"
      >
        <Nav />
        <div>{children}</div>
        <HomeSidebar />
      </Column>
    </AnalyticsContext>
  );
}
