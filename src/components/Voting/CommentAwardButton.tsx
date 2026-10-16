import type { CommentListItem } from "@/lib/comments/commentLists";
import { InteractionWrapper } from "@/lib/hooks/useClickableCell";
import {
  commentAwardedAmount,
  commentAwardPostHref,
  commentAwardsEnabled,
} from "@/lib/commentAwards/commentAwardHelpers";
import TrophyIcon from "@heroicons/react/24/solid/TrophyIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default function CommentAwardButton({
  comment,
}: Readonly<{
  comment: CommentListItem;
}>) {
  if (!commentAwardsEnabled) {
    return null;
  }

  const amount = commentAwardedAmount(comment);
  if (amount <= 0) {
    return null;
  }

  return (
    <InteractionWrapper>
      <Tooltip
        title={
          <Type style="bodySmall" className="max-w-55 text-center">
            This comment has been awarded ${amount}. Click for more info.
          </Type>
        }
        className="ml-1 -mr-1"
      >
        <Link
          href={commentAwardPostHref}
          className="
            flex items-center justify-center rounded hover:bg-item-hover px-1 h-6
          "
        >
          <TrophyIcon className="w-4 text-karma-star" />
        </Link>
      </Tooltip>
    </InteractionWrapper>
  );
}
