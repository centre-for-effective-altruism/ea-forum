import PostsListSkeleton from "../PostsList/PostsListSkeleton";

export default function SequencePageSkeleton() {
  return (
    <div data-component="SequencePageSkeleton" className="w-full pb-16">
      <div className="max-w-[765px] mx-auto px-4 pt-10 sm:pt-16">
        <div className="rounded bg-gray-0 p-6 sm:p-10 flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <div className="h-[42px] w-96 max-w-full bg-gray-300 rounded" />
            <div className="h-4 w-48 bg-gray-200 rounded" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-2/3 bg-gray-200 rounded" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="h-[25px] w-64 max-w-full bg-gray-300 rounded" />
            <PostsListSkeleton count={6} />
          </div>
        </div>
      </div>
    </div>
  );
}
