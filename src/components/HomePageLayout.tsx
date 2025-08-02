import type { ReactNode } from "react";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import HomeSidebar from "./HomeSidebar/HomeSidebar";
import Column from "./Column";
import Type from "./Type";
import Nav from "./Nav";

export default async function HomePageLayout({
  mainPostsList,
  communityPostsList,
  quickTakesList,
  popularCommentsList,
  recentDiscussionList,
}: Readonly<{
  mainPostsList: ReactNode
  communityPostsList: ReactNode
  quickTakesList: ReactNode
  popularCommentsList: ReactNode
  recentDiscussionList: ReactNode
}>) {
  return (
    <AnalyticsContext pageContext="homePage">
      <Column
        className="grid grid-cols-[min-content_1fr_min-content] gap-10 px-8"
        data-component="HomePageLayout"
      >
        <Nav />
        <div>
          <Type className="mb-2" style="sectionTitleLarge">New &amp; upvoted</Type>
          <div className="mb-10">
            {mainPostsList}
          </div>
          <Type className="mb-2" style="sectionTitleLarge">Posts tagged community</Type>
          <div className="mb-10">
            {communityPostsList}
          </div>
          <Type className="mb-2" style="sectionTitleLarge">Quick takes</Type>
          <div className="mb-10">
            {quickTakesList}
          </div>
          <Type className="mb-2" style="sectionTitleLarge">Popular comments</Type>
          <div className="mb-10">
            {popularCommentsList}
          </div>
          <Type className="mb-2" style="sectionTitleLarge">Recent discussion</Type>
          <div>
            {recentDiscussionList}
          </div>
        </div>
        <HomeSidebar />
      </Column>
    </AnalyticsContext>
  );
}
