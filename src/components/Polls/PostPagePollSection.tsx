import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { captureException } from "@sentry/nextjs";
import toast from "react-hot-toast";
import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import {
  forumEventIsMcPoll,
  getForumEventVoteForUser,
} from "@/lib/forumEvents/forumEventHelpers";
import { makeCloudinaryImageUrl } from "@/lib/cloudinary/cloudinaryHelpers";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { tagGetPageUrl } from "@/lib/tags/tagHelpers";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import { rpc } from "@/lib/rpc";
import clsx from "clsx";
import LinkIcon from "@heroicons/react/20/solid/LinkIcon";
import ForumEventPoll from "./ForumEventPoll";
import ForumEventMcPoll from "./ForumEventMcPoll";
import Link from "../Link";
import Type from "../Type";

export default function PostPagePollSection({
  forumEventId,
  ...divProps
}: Readonly<
  {
    forumEventId: string;
  } & React.HTMLAttributes<HTMLDivElement>
>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pollRef = useRef<HTMLDivElement>(null);
  const { captureEvent } = useTracking();
  const { currentUser } = useCurrentUser();
  const [event, setEvent] = useState<ForumEventBase | null>(null);

  const hasVoted = getForumEventVoteForUser(event, currentUser) !== null;
  const eventTagUrl = event?.tag ? tagGetPageUrl({ tag: event.tag }) : null;
  const queryPollId = searchParams.get("pollId");
  const isLinkedPoll = queryPollId === event?._id;

  useEffect(() => {
    if (queryPollId && event?._id === queryPollId && pollRef.current) {
      const yOffset = -80;
      const pollTop = pollRef.current.getBoundingClientRect().top;
      const y = pollTop + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [queryPollId, event?._id]);

  const refetchEvent = useCallback(async () => {
    try {
      const result = await rpc.forumEvents.listById({ _id: forumEventId });
      setEvent(result);
    } catch (e) {
      console.error(`Error fetching forum event ${forumEventId}:`, e);
      captureException(e);
    }
  }, [forumEventId]);

  useEffect(() => {
    void refetchEvent();
  }, [refetchEvent]);

  const handleLinkClick = useCallback(async () => {
    if (!event) {
      return;
    }

    captureEvent("pollLinkClicked", { pollId: event._id });

    // Copy to clipboard
    const pathWithPoll = `${pathname}?pollId=${event._id}`;
    const url = `${window.location.origin}${pathWithPoll}`;
    await navigator.clipboard.writeText(url);
    toast("Link copied to clipboard");

    // Navigate to new URL
    router.push(pathWithPoll);
  }, [event, captureEvent, router, pathname]);

  if (!event) {
    return null;
  }

  const {
    eventFormat,
    isGlobal,
    postId,
    darkColor,
    lightColor,
    bannerTextColor,
    bannerImageId,
  } = event;

  const isMcPoll = forumEventIsMcPoll(event);
  // Both poll formats are stored with eventFormat "POLL"; the multiple-choice
  // variant is distinguished by publicData (see forumEventIsMcPoll).
  const isPoll = eventFormat === "POLL";
  if (!isPoll || (isGlobal && !postId)) {
    return null;
  }

  const pollAreaStyle = {
    "--forum-event-background": darkColor,
    "--forum-event-foreground": lightColor,
    "--forum-event-banner-text": bannerTextColor,
  } as CSSProperties;

  if (bannerImageId) {
    const imageUrl = makeCloudinaryImageUrl(bannerImageId, {
      c: "fill",
      dpr: "auto",
      q: "auto",
      f: "auto",
      g: "north",
    });
    pollAreaStyle.background = `top / cover no-repeat url(${imageUrl}),${darkColor}`;
  }

  return (
    <AnalyticsContext pageSectionContext="forumEventPostPagePollSection">
      <div
        data-component="PostPagePollSection"
        ref={pollRef}
        id={`poll-${event._id}`}
        className="relative w-full py-6 rounded mb-10 scroll-mt-25"
        {...divProps}
      >
        {event.isGlobal && (
          <>
            <Type As="h2" style="commentsHeader" className="mb-2">
              {!hasVoted ? "Have you voted yet?" : "Did this post change your mind?"}
            </Type>
            <Type style="bodyMedium" className="mb-5">
              {eventTagUrl && (
                <>
                  This post is part of{" "}
                  <Link href={eventTagUrl} className="underline hover:no-underline">
                    {event.title}
                  </Link>
                  .{" "}
                </>
              )}
              {!hasVoted ? (
                <>
                  Click and drag your avatar to vote on the debate statement. Votes
                  are non-anonymous, and you can change your mind.
                </>
              ) : (
                <>
                  If it changed your mind, click and drag your avatar to move your
                  vote below.
                </>
              )}
            </Type>
          </>
        )}
        <div
          className="
            relative pt-6 rounded bg-(--forum-event-background) border-1
            border-[color-mix(in_srgb,var(--forum-event-banner-text)_30%,var(--forum-event-background))]
          "
          style={pollAreaStyle}
        >
          <button
            onClick={handleLinkClick}
            className={clsx(
              "absolute top-[3px] right-[1px] cursor-pointer p-2",
              isLinkedPoll
                ? "[&_svg]:stroke-current [&_svg]:stroke-[0.7px] text-primary"
                : "text-gray-600",
            )}
          >
            <LinkIcon className="block w-4 opacity-80" />
          </button>
          {isMcPoll ? (
            <ForumEventMcPoll event={event} refetchEvent={refetchEvent} />
          ) : (
            <ForumEventPoll
              event={event}
              refetchEvent={refetchEvent}
              hideViewResults={event.isGlobal}
            />
          )}
        </div>
      </div>
    </AnalyticsContext>
  );
}
