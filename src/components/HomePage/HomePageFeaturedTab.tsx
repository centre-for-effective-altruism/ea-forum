"use client";

import { useHomePage } from "./HomePageContext";
import FeaturedPost from "../FeaturedCards/FeaturedPost";
import Type from "../Type";

export default function HomePageFeaturedTab() {
  const { currentTab, featuredPosts, curatedPost } = useHomePage();
  if (currentTab !== "featured") {
    return null;
  }
  return (
    <div>
      <Type style="bodyLarge" className="text-gray-600 mb-6">
        Selected posts to help us answer: How can we do the most good with our
        resources?
      </Type>
      <div className="grid grid-cols-3 gap-1">
        {curatedPost && (
          <FeaturedPost post={curatedPost} large className="row-span-2" />
        )}
        {featuredPosts.slice(0, 4).map((post) => (
          <FeaturedPost key={post._id} post={post} />
        ))}
      </div>
    </div>
  );
}
