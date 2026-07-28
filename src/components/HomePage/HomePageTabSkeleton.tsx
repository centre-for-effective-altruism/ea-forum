import type { HomePageTabName } from "./homePageHelpers";
import range from "lodash/range";
import {
  defaultFeaturedViewType,
  type PostsListViewType,
} from "@/lib/posts/postsListView";
import FeaturedPostSkeleton from "../FeaturedCards/FeaturedPostSkeleton";
import HomePageFeaturedTabLayout from "./HomePageFeaturedTabLayout";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";

export default function HomePageTabSkeleton({
  tab,
  featuredView = defaultFeaturedViewType,
}: Readonly<{
  tab: HomePageTabName;
  featuredView?: PostsListViewType;
}>) {
  switch (tab) {
    case "featured":
      return (
        <HomePageFeaturedTabLayout
          view={featuredView}
          viewPicker={<div className="bg-gray-200 rounded w-[56px] h-[32px]" />}
          posts={range(11).map((i) => (
            <FeaturedPostSkeleton key={i} large={i === 0} />
          ))}
          listSection={<PostsListSkeleton count={11} viewType="list" />}
          commentsSection={
            <div className="grid grid-cols-2 gap-1">
              {range(6).map((i) => (
                <div
                  key={i}
                  className="
                    h-30 bg-surface-floating rounded border-1 border-gray-200
                  "
                />
              ))}
            </div>
          }
        />
      );
    case "magic":
      return (
        <div className="max-w-[1000px]">
          <div className="w-full max-w-full h-[29px] rounded bg-gray-200 mb-5" />
          <PostsListSkeleton count={1} className="mb-1" />
          <PostsListSkeleton count={30} />
        </div>
      );
    default:
      console.error("Invalid home page tab name:", tab);
      return null;
  }
}
