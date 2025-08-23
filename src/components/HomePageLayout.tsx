import type { ReactNode } from "react";
import HomePageColumns from "./HomePageColumns";
import Type from "./Type";

export default async function HomePageLayout({
  mainPostsList,
  communityPostsList,
  quickTakesList,
  popularCommentsList,
  recentDiscussionList,
}: Readonly<{
  mainPostsList: ReactNode;
  communityPostsList: ReactNode;
  quickTakesList: ReactNode;
  popularCommentsList: ReactNode;
  recentDiscussionList: ReactNode;
}>) {
  return (
    <HomePageColumns pageContext="homePage">
      <Type className="mb-2" style="sectionTitleLarge">
        New &amp; upvoted
      </Type>
      <div className="mb-10">{mainPostsList}</div>
      <Type className="mb-2" style="sectionTitleLarge">
        Posts tagged community
      </Type>
      <div className="mb-10">{communityPostsList}</div>
      <Type className="mb-2" style="sectionTitleLarge">
        Quick takes
      </Type>
      <div className="mb-10">{quickTakesList}</div>
      <Type className="mb-2" style="sectionTitleLarge">
        Popular comments
      </Type>
      <div className="mb-10">{popularCommentsList}</div>
      <Type className="mb-2" style="sectionTitleLarge">
        Recent discussion
      </Type>
      <div>{recentDiscussionList}</div>
    </HomePageColumns>
  );
}
