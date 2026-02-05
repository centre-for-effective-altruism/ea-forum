import type { CommentsList } from "@/lib/comments/commentLists";
import { userGetProfileUrl } from "@/lib/users/userHelpers";
import EllipsisVerticalIcon from "@heroicons/react/24/outline/EllipsisVerticalIcon";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import CommentBody from "../ContentStyles/CommentBody";
import UsersTooltip from "../UsersTooltip";
import TimeAgo from "../TimeAgo";
import Score from "../Score";
import Type from "../Type";
import Link from "../Link";

export default function QuickTakeItem({
  quickTake,
}: Readonly<{
  quickTake: CommentsList;
}>) {
  const { baseScore, voteCount, user, postedAt, descendentCount, html } = quickTake;
  return (
    <article
      data-component="QuickTakeItem"
      className="max-w-full rounded bg-gray-50 border border-gray-100 px-4 py-3"
    >
      <div className="flex flex-row gap-2 items-center mb-2 text-gray-600">
        <Score baseScore={baseScore} voteCount={voteCount} orient="horizontal" />
        <Type style="body" className="text-black font-[700]">
          {user ? (
            <Link href={userGetProfileUrl({ user })}>
              <UsersTooltip As="span" user={user}>
                {user.displayName}
              </UsersTooltip>
            </Link>
          ) : (
            "[Anonymous]"
          )}
        </Type>
        <TimeAgo time={postedAt} />
        <div className="grow" />
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
