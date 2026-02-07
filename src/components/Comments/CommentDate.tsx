import type { CommentsList } from "@/lib/comments/commentLists";
import { commentGetPageUrl } from "@/lib/comments/commentHelpers";
import { formatLongDateWithTime, formatRelativeTime } from "@/lib/timeUtils";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default function CommentDate({
  comment,
}: Readonly<{
  comment: CommentsList;
}>) {
  const { postedAt, lastEditedAt } = comment;
  const isEdited = !!lastEditedAt && lastEditedAt !== postedAt;
  return (
    <Tooltip
      title={
        isEdited ? (
          <>
            <Type style="bodySmall">Posted {formatLongDateWithTime(postedAt)}</Type>
            <Type style="bodySmall">
              Last edited {formatLongDateWithTime(lastEditedAt)}
            </Type>
          </>
        ) : (
          <Type style="bodySmall">{formatLongDateWithTime(postedAt)}</Type>
        )
      }
    >
      <Type>
        <Link
          href={commentGetPageUrl({ comment })}
          className="text-gray-600 hover:text-gray-1000"
        >
          {formatRelativeTime(postedAt, { style: "short" })}
          {isEdited && "*"}
        </Link>
      </Type>
    </Tooltip>
  );
}
