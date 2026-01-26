import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import ChevronUpIcon from "@heroicons/react/16/solid/ChevronUpIcon";
import Type from "../Type";
import PostColumn from "./PostColumn";

export default function PostDisplaySkeleton() {
  return (
    <PostColumn>
      {/* Title */}
      <div className="bg-gray-300 rounded mb-10 h-[52px] w-full" />
      <div className="flex gap-3 mb-6">
        {/* User profile image */}
        <div
          className={`
            rounded-full min-w-8 w-[36px] h-[36px]
            bg-linear-to-r from-gray-300 to-gray-200
          `}
        />
        <div className="flex flex-col justify-center gap-1">
          {/* User name */}
          <div className="h-3 w-30 rounded bg-gray-300" />
          {/* Read time and date */}
          <div className="h-3 w-36 rounded bg-gray-200" />
        </div>
      </div>
      <div
        className="
          py-4 border-y border-(--color-posts-page-hr) text-gray-600
          flex items-center
        "
      >
        <div className="flex items-center gap-4 grow">
          {/* Voting */}
          <div className="flex items-center gap-1">
            <ChevronDownIcon className="w-[20px]" />
            <Type style="bodyMedium" className="text-[16px]">
              <div className="h-3 w-6 rounded bg-gray-300" />
            </Type>
            <ChevronUpIcon className="w-[20px]" />
          </div>
          {/* Comment count */}
          <Type style="bodyMedium" className="flex items-center gap-1">
            <ChatBubbleLeftIcon className="w-[22px]" />
            <div className="h-3 w-6 rounded bg-gray-200" />
          </Type>
        </div>
        {/* RHS buttons */}
        <div className="h-3 w-16 rounded bg-gray-200" />
      </div>
      {/* Tags */}
      <div className="mt-6 bg-gray-200 rounded mb-10 h-[24px] w-full" />
      {/* Post body */}
      <div className="mt-10 w-full flex flex-col gap-[1em]">
        <div className="w-full h-50 bg-gray-100 rounded" />
        <div className="w-full h-50 bg-gray-100 rounded" />
        <div className="w-full h-50 bg-gray-100 rounded" />
      </div>
    </PostColumn>
  );
}
