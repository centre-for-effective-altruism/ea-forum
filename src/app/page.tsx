import { Suspense } from "react";
import HomePageColumns from "@/components/HomePageColumns";
import PostsListSkeleton from "@/components/PostsList/PostsListSkeleton";
import FrontpagePostsList from "@/components/PostsList/FrontpagePostsList";
import QuickTakesListSkeleton from "@/components/QuickTakes/QuickTakesListSkeleton";
import FrontpageQuickTakesList from "@/components/QuickTakes/FrontpageQuickTakesList";
import Editor from "@/components/Editor/Editor";
import Type from "@/components/Type";

export default function HomePage() {
  return (
    <HomePageColumns pageContext="homePage">
      <Editor
        formType="new"
        collectionName="Comments"
        fieldName="contents"
        value={{ type: "ckEditorMarkup", value: "" }}
        hideControls
      />
      <Type className="mb-2" style="sectionTitleLarge">
        New &amp; upvoted
      </Type>
      <div className="mb-10">
        <Suspense fallback={<PostsListSkeleton count={11} />}>
          <FrontpagePostsList initialLimit={11} />
        </Suspense>
      </div>
      <Type className="mb-2" style="sectionTitleLarge">
        Posts tagged community
      </Type>
      <div className="mb-10">
        <Suspense fallback={<PostsListSkeleton count={5} />}>
          <FrontpagePostsList initialLimit={5} community />
        </Suspense>
      </div>
      <Type className="mb-2" style="sectionTitleLarge">
        Quick takes
      </Type>
      <div className="mb-10">
        <Suspense fallback={<QuickTakesListSkeleton count={5} />}>
          <FrontpageQuickTakesList initialLimit={5} />
        </Suspense>
      </div>
      <Type className="mb-2" style="sectionTitleLarge">
        Popular comments
      </Type>
      <div className="mb-10">TODO: Popular comments list</div>
      <Type className="mb-2" style="sectionTitleLarge">
        Recent discussion
      </Type>
      <div>TODO: Recent discussions list</div>
    </HomePageColumns>
  );
}
