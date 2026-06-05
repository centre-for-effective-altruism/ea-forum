import type { CommentListItem } from "@/lib/comments/commentLists";
import {
  pollVoteIsAgreement,
  pollVoteToPercentage,
  stripFootnotes,
} from "@/lib/utils/pollHelpers";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default function CommentPollVote({
  comment: { forumEvent, forumEventMetadata },
}: Readonly<{
  comment: CommentListItem;
}>) {
  const voteWhenPublished = forumEventMetadata?.poll?.voteWhenPublished;
  if (voteWhenPublished === null || voteWhenPublished === undefined) {
    return null;
  }

  const latestVote = forumEventMetadata?.poll?.latestVote;

  const isGlobal = forumEvent?.isGlobal !== false;
  const pollLink = !isGlobal && forumEvent ? `#${forumEvent._id}` : undefined;

  const agreeWording = forumEvent?.pollAgreeWording || "agree";
  const disagreeWording = forumEvent?.pollDisagreeWording || "disagree";

  const endAgreement = pollVoteIsAgreement(latestVote ?? voteWhenPublished);
  const startAgreement = pollVoteIsAgreement(voteWhenPublished);

  const endPercentage = pollVoteToPercentage(latestVote ?? voteWhenPublished);
  const startPercentage = pollVoteToPercentage(voteWhenPublished);

  const showStartAgreement = startAgreement !== endAgreement;
  const showStartPercentage =
    showStartAgreement || endPercentage !== startPercentage;

  const CurrentVoteTag = isGlobal ? "span" : Link;

  const questionWording = forumEvent?.pollQuestion?.html
    ? stripFootnotes(forumEvent.pollQuestion.html)
    : null;

  return (
    <Type style="bodySmall" className="whitespace-nowrap font-[600]">
      {showStartPercentage && (
        <span className={startAgreement ? "text-primary" : "text-warning-light"}>
          <Tooltip
            title={<Type style="bodySmall">Vote when comment was posted</Type>}
            placement="top"
            As="span"
          >
            <s>
              {startPercentage}
              {showStartAgreement &&
                (startAgreement ? ` ${agreeWording}` : ` ${disagreeWording}`)}
            </s>
          </Tooltip>
          {/* Right arrow */}
          &nbsp;&#10132;&nbsp;
        </span>
      )}
      <Tooltip
        title={
          questionWording ? (
            <Type style="bodySmall">
              With the statement &quot;{questionWording}&quot;
            </Type>
          ) : null
        }
        placement="top"
        As="span"
      >
        <CurrentVoteTag
          className={endAgreement ? "text-primary" : "text-warning-light"}
          href={pollLink!}
        >
          {endPercentage}
          {endAgreement ? ` ${agreeWording}` : ` ${disagreeWording}`}
        </CurrentVoteTag>
      </Tooltip>
    </Type>
  );
}
