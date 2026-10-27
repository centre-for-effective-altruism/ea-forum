import PostsListSkeleton from "../PostsList/PostsListSkeleton";

export default function TopicIntroSequenceSkeleton() {
  return (
    <div data-component="TopicIntroSequenceSkeleton" className="flex flex-col gap-2">
      <div className="mt-6 h-4 w-48 bg-gray-200 rounded" />
      <PostsListSkeleton count={3} />
    </div>
  );
}
