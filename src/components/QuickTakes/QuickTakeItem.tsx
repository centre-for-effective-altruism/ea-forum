import type { IFrontpageQuickTakes } from "@/lib/comments/commentQueries.schemas";
import EllipsisVerticalIcon from "@heroicons/react/24/outline/EllipsisVerticalIcon";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import CommentBody from "../ContentStyles/CommentBody";
import TimeAgo from "../TimeAgo";
import Score from "../Score";
import Type from "../Type";

export default function QuickTakeItem({
  quickTake,
}: Readonly<{
  quickTake: IFrontpageQuickTakes;
}>) {
  const { baseScore, voteCount, user, postedAt, descendentCount, html } = quickTake;
  return (
    <article
      className="max-w-full rounded bg-gray-50 border border-gray-100 px-4 py-3"
      data-component="QuickTakeItem"
    >
      <div className="flex flex-row w-full gap-2 items-center mb-2 text-gray-600">
        <Score baseScore={baseScore} voteCount={voteCount} orient="horizontal" />
        <Type style="body" className="text-black font-[700]">
          {user.displayName}
        </Type>
        <TimeAgo time={postedAt} className="grow" />
        <Type
          style="body"
          className="flex flex-row gap-1 cursor-pointer hover:text-black"
        >
          <ChatBubbleLeftIcon className="w-[16px]" />
          {descendentCount}
        </Type>
        <EllipsisVerticalIcon className="w-[16px] cursor-pointer hover:text-black" />
      </div>
      <CommentBody html={html} className="line-clamp-2" />
    </article>
  );
}
