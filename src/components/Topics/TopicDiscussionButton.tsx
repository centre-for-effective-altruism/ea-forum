import type { TopicPageTag } from "@/lib/tags/tagPageQueries";
import { countTagDiscussionComments } from "@/lib/comments/commentLists";
import { tagGetDiscussionUrl } from "@/lib/tags/tagHelpers";
import { getCurrentUser } from "@/lib/users/currentUser";
import ChatBubbleLeftIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import clsx from "clsx";
import Link from "../Link";
import Type from "../Type";

export default async function TopicDiscussionButton({
  tag,
  className,
}: Readonly<{ tag: TopicPageTag; className?: string }>) {
  const currentUser = await getCurrentUser();
  const count = await countTagDiscussionComments({
    currentUser,
    tagId: tag._id,
  });
  return (
    <Link
      href={tagGetDiscussionUrl({ tag })}
      className={clsx(
        "flex items-center gap-1 text-gray-600 hover:text-gray-1000",
        className,
      )}
    >
      <ChatBubbleLeftIcon className="w-[18px] h-[18px]" />
      <Type As="span" style="loadMore">
        Discussion ({count})
      </Type>
    </Link>
  );
}
