import Type from "../Type";

export default function CommentsSectionSkeleton() {
  return (
    <>
      <Type style="commentsHeader" className="mt-18 mb-6 flex items-center gap-2">
        Comments <div className="h-6 w-8 rounded bg-gray-200" />
      </Type>
      <div className="mb-20 flex flex-col gap-4">
        <div className="w-full h-30 bg-gray-100 rounded" />
        <div className="w-full h-30 bg-gray-100 rounded" />
        <div className="w-full h-30 bg-gray-100 rounded" />
      </div>
    </>
  );
}
