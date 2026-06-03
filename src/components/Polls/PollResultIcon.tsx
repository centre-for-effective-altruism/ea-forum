import { useState } from "react";
import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import type { ForumEventVoteDisplay } from "@/lib/utils/pollHelpers";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import UserProfileImage from "../UserProfileImage";
import Tooltip from "../Tooltip";
import Type from "../Type";

export default function PollResultIcon({
  vote: { user, comment },
  event,
  tooltipDisabled,
}: Readonly<{
  vote: ForumEventVoteDisplay;
  event: ForumEventBase,
  tooltipDisabled: boolean;
}>) {
  const [isPinned, setIsPinned] = useState(false);
  const [newRepliesCount, setNewRepliesCount] = useState(0);
  // const isDesktop = useIsAboveBreakpoint('sm');
  // const { eventHandlers, hover, anchorEl } = useHover();
  // const popperOpen = (hover || isPinned) && isDesktop;

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
          title={<Type style="bodySmall">{user.displayName}</Type>}
          disabled={!!comment}
        >
          <UserProfileImage
            user={user}
            // The actual size gets overridden by the className. This is still
            // needed to get the right resolution from Cloudinary.
            size={34}
            className="
              w-full! h-[unset]!
              [outline:2px_solid_color-mix(in_oklab,_var(--forum-event-foreground)_50%,_var(--forum-event-background)_50%)]
            "
          />
        </Tooltip>
        {/*
          * Controlling whether the popper is open is done outside the component
          * so that it fully unmounts and clears all the state when closed
        {!tooltipDisabled && comment && popperOpen && (
          <ForumEventResultPopper
            anchorEl={anchorEl}
            user={user}
            comment={comment}
            setIsPinned={setIsPinned}
            isPinned={isPinned}
            newRepliesCount={newRepliesCount}
            setNewRepliesCount={setNewRepliesCount}
          />
        )}
          */}
      </div>
    </AnalyticsContext>
  );
}
