import PostColumn from "../PostsPage/PostColumn";
import PostsListSkeleton from "../PostsList/PostsListSkeleton";
import TopicDescriptionSkeleton from "./TopicDescriptionSkeleton";
import TopicSidebarSkeleton from "./TopicSidebarSkeleton";

export default function TopicPageSkeleton() {
  return (
    <div
      data-component="TopicPageSkeleton"
      className="px-4 sm:px-2 pt-12 sm:pt-20 md:pt-28 pb-16 bg-post-body-bg"
    >
      <PostColumn
        left={
          <div className="sticky left-0 top-18 pl-8 pt-5 flex flex-col gap-6">
            <div className="h-5 w-44 bg-gray-200 rounded" />
            <TopicSidebarSkeleton />
          </div>
        }
      >
        <div className="flex flex-col gap-4 mb-10">
          <div className="h-[52px] w-80 max-w-full bg-gray-300 rounded" />
          <div className="h-8 w-48 bg-gray-200 rounded" />
        </div>
        <div className="flex flex-col gap-12">
          <TopicDescriptionSkeleton />
          <PostsListSkeleton count={8} />
        </div>
      </PostColumn>
    </div>
  );
}
