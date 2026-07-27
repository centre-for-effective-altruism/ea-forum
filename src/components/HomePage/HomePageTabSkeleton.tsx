import type { HomePageTabName } from "./homePageHelpers";
import range from "lodash/range";
import FeaturedPostSkeleton from "../FeaturedCards/FeaturedPostSkeleton";
import HomePageFeaturedTabLayout from "./HomePageFeaturedTabLayout";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";

export default function HomePageTabSkeleton({
  tab,
}: Readonly<{
  tab: HomePageTabName;
}>) {
  switch (tab) {
    case "featured":
      return (
        <HomePageFeaturedTabLayout
          posts={range(11).map((i) => (
            <FeaturedPostSkeleton key={i} large={i === 0} />
          ))}
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
