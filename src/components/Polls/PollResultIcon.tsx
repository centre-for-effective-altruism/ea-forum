import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import type { ForumEventVoteDisplay } from "@/lib/utils/pollHelpers";
import { commentGetPageUrl } from "@/lib/comments/commentHelpers";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import CommentBody from "../ContentStyles/CommentBody";
import UserProfileImage from "../UserProfileImage";
import UsersName from "../UsersName";
import Tooltip from "../Tooltip";
import Type from "../Type";
import Link from "../Link";

export default function PollResultIcon({
  vote: { user, comment },
  event,
  tooltipDisabled,
}: Readonly<{
  vote: ForumEventVoteDisplay;
  event: ForumEventBase;
  tooltipDisabled: boolean;
}>) {
  if (!user?.displayName) {
    return null;
  }
  return (
    <AnalyticsContext
      pageElementContext="forumEventResultIcon"
      forumEventId={event._id}
      userIdDisplayed={user._id}
    >
      <div
        data-component="PollResultIcon"
        className="
          animate-poll-results-fade-in relative flex flex-col justify-end
          w-full z-1 -mt-[5px] sm:-mt-[1px] md:-mt-[3px]
        "
      >
        <Tooltip
          title={
            comment ? (
              <div className="w-[350px] max-w-full">
                <div className="flex items-center gap-3 mb-4">
                  <UserProfileImage user={comment.user} size={40} />
                  <Type style="bodyHeavy">
                    <UsersName user={comment.user} />
                  </Type>
                </div>
                <CommentBody html={comment.html} />
                <Type style="bodyHeavy" className="flex justify-end mt-1">
                  <Link
                    href={commentGetPageUrl({ comment })}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Go to thread
                  </Link>
                </Type>
              </div>
            ) : (
              <Type style="bodySmall">{user.displayName}</Type>
            )
          }
          disabled={tooltipDisabled}
          interactable={!!comment}
          tooltipClassName={
            comment ? "bg-surface-floating! text-gray-900! p-3!" : undefined
          }
        >
          <UserProfileImage
            user={user}
            // The actual size gets overridden by the className. This is still
            // needed to get the right resolution from Cloudinary.
            size={34}
            responsive
            className="
              w-full! h-[unset]!
              [outline:2px_solid_color-mix(in_oklab,_var(--forum-event-foreground)_50%,_var(--forum-event-background)_50%)]
            "
          />
        </Tooltip>
      </div>
    </AnalyticsContext>
  );
}
