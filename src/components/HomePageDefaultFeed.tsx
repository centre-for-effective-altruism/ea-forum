import { Suspense } from "react";
import Type from "./Type";
import PostsListSkeleton from "./PostsList/PostsListSkeleton";
import FrontpagePostsList from "./PostsList/FrontpagePostsList";
import QuickTakesListSkeleton from "./QuickTakes/QuickTakesListSkeleton";
import FrontpageQuickTakesList from "./QuickTakes/FrontpageQuickTakesList";

export default function HomePageDefaultFeed() {
  return (
    <>
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
    </>
  );
}
