import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import Type from "../Type";

export default function HomePageFeedSkeleton({ postCount }: { postCount: number }) {
  return (
    <>
      <Type className="mb-2" style="sectionTitleLarge">
        New &amp; upvoted
      </Type>
      <div className="mb-10">
        <PostsListSkeleton count={postCount} />
      </div>
    </>
  );
}
