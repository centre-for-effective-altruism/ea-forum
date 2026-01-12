import type { SearchComment } from "@/lib/search/searchDocuments";
import { commentGetPageUrlFromIds } from "@/lib/comments/commentHelpers";
import ChatBubbleLeftIcon from "@heroicons/react/24/solid/ChatBubbleLeftIcon";
import HeaderSearchResult from "./HeaderSearchResult";
import TimeAgo from "../TimeAgo";

export default function HeaderSearchComment({
  comment,
}: Readonly<{
  comment: SearchComment;
}>) {
  return (
    <HeaderSearchResult
      tooltipTitle="Comment"
      href={commentGetPageUrlFromIds({
        commentId: comment._id,
        postId: comment.postId,
        postSlug: comment.postSlug,
        tagSlug: comment.tagSlug,
        tagCommentType: comment.tagCommentType,
      })}
      Icon={ChatBubbleLeftIcon}
    >
      <div>
        <div className="flex gap-2">
          <span>{comment.authorDisplayName}</span>
          <TimeAgo textStyle="bodySmall" As="span" time={comment.postedAt} />
          <span>{comment.baseScore} karma</span>
        </div>
        <div className="line-clamp-2">{comment.body}</div>
      </div>
    </HeaderSearchResult>
  );
}
