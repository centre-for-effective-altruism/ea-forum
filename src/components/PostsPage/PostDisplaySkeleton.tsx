import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import ChevronUpIcon from "@heroicons/react/16/solid/ChevronUpIcon";
import Type from "../Type";

export default function PostDisplaySkeleton() {
  return (
    <>
      {/* Title */}
      <div className="bg-gray-300 rounded mb-10 h-[52px] w-full" />
      {/* User, read time and date */}
      <div className="flex gap-3 mb-6">
        <div
          className={`
            rounded-full min-w-8 w-[36px] h-[36px]
            bg-linear-to-r from-gray-300 to-gray-200
          `}
        />
      </div>
      <div className="py-4 border-y border-(--color-posts-page-hr) text-gray-600 flex">
        <div className="flex items-center gap-4 grow">
          <div className="flex items-center gap-1">
            <ChevronDownIcon className="w-[20px]" />
            <Type style="bodyMedium" className="text-[16px]">
              <div className="h-3 w-6 rounded bg-grey-300" />
            </Type>
            <ChevronUpIcon className="w-[20px]" />
          </div>
          <Type style="bodyMedium" className="flex items-center gap-1">
            <ChatBubbleLeftIcon className="w-[22px]" />
            <div className="h-3 w-6 rounded bg-grey-200" />
          </Type>
        </div>
        <div className="h-3 w-6 rounded bg-grey-300" />
      </div>
      {/* Tags */}
      <div className="bg-gray-200 rounded mb-10 h-[24px] w-full" />
      {/* Post body */}
      <div className="mt-10 w-full flex flex-col gap-[1em]">
        <div className="w-full h-50 bg-gray-100 rounded" />
        <div className="w-full h-50 bg-gray-100 rounded" />
        <div className="w-full h-50 bg-gray-100 rounded" />
      </div>
    </>
  );
}
