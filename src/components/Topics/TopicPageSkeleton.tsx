import PostColumn from "../PostsPage/PostColumn";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import TopicDescriptionSkeleton from "./TopicDescriptionSkeleton";

export default function TopicPageSkeleton() {
  return (
    <div data-component="TopicPageSkeleton" className="py-10 px-2">
      <PostColumn>
        <div className="flex flex-col gap-6">
          <div className="h-9 w-80 max-w-full bg-gray-300 rounded" />
          <TopicDescriptionSkeleton />
          <PostsListSkeleton count={8} />
        </div>
      </PostColumn>
    </div>
  );
}
