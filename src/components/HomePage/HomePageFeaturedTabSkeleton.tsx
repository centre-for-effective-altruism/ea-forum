import range from "lodash/range";
import HomePageFeaturedTabLayout from "./HomePageFeaturedTabLayout";
import FeaturedPostSkeleton from "../FeaturedCards/FeaturedPostSkeleton";

export default function HomePageFeaturedTabSkeleton() {
  return (
    <HomePageFeaturedTabLayout
      posts={range(11).map((i) => (
        <FeaturedPostSkeleton key={i} large={i === 0} />
      ))}
      commentsSection={
        <div className="grid grid-cols-2 gap-1">
          {range(6).map((i) => (
            <div key={i} className="h-30 bg-gray-200 rounded" />
          ))}
        </div>
      }
    />
  );
}
