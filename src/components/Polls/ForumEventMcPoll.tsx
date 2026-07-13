"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { captureException } from "@sentry/nextjs";
import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { UserBase } from "@/lib/users/userQueries";
import {
  ForumEventCommentMetadata,
  getMcPollPublicData,
  getMcPollVoteForUser,
} from "@/lib/forumEvents/forumEventHelpers";
import {
  aggregateMcPollVotes,
  createQuestionNode,
  stripFootnotes,
} from "@/lib/utils/pollHelpers";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { commentGetPageUrlFromIds } from "@/lib/comments/commentHelpers";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { rpc } from "@/lib/rpc";
import clsx from "clsx";
import ForumEventCommentForm from "../ForumEvents/ForumEventCommentForm";
import PollResultIcon from "./PollResultIcon";
import PollSubtitle from "./PollSubtitle";
import Loading from "../Loading";
import Link from "../Link";

// Cap on how many voter avatars to show per answer row before collapsing into
// a "+N" overflow bubble.
const MAX_ROW_AVATARS = 8;

export default function ForumEventMcPoll({
  event,
  refetchEvent,
  className,
}: Readonly<{
  event: ForumEventBase;
  refetchEvent: () => Promise<void>;
  className?: string;
}>) {
  const { onLogin } = useLoginPopoverContext();
  const { currentUser } = useCurrentUser();
  const { captureEvent } = useTracking();

  const [currentUserAnswerIds, setCurrentUserAnswerIds] = useState<
    string[] | null
  >(() => getMcPollVoteForUser(event, currentUser));
  const [resultsVisible, setResultsVisible] = useState(false);
  const [commentFormOpen, setCommentFormOpen] = useState(false);
  const [voters, setVoters] = useState<UserBase[] | null>(null);
  const [comments, setComments] = useState<CommentListItem[] | null>(null);

  const hasVoted = (currentUserAnswerIds?.length ?? 0) > 0;
  const votingOpen = !event.endDate || new Date(event.endDate) > new Date();

  const pollData = useMemo(
    () => getMcPollPublicData({ publicData: event.publicData }),
    [event.publicData],
  );
  const multiSelect = pollData.multiSelect;

  const refetchVoters = useCallback(async () => {
    try {
      const voterIds = Object.keys(pollData.votes).slice(0, 1000);
      const result = voterIds.length
        ? await rpc.users.listByIds({ userIds: voterIds })
        : {};
      setVoters(Object.values(result));
    } catch (e) {
      console.error("Error fetching poll voters:", e);
      captureException(e);
    }
  }, [pollData]);

  useEffect(() => {
    void refetchVoters();
  }, [refetchVoters]);

  const refetchComments = useCallback(async () => {
    try {
      const result = await rpc.comments.listByForumEvent({
        forumEventId: event._id,
      });
      setComments(result);
    } catch (e) {
      console.error("Error fetching poll comments:", e);
      captureException(e);
    }
  }, [event._id]);

  useEffect(() => {
    void refetchComments();
  }, [refetchComments]);

  const currentUserComment = useMemo(() => {
    if (!currentUser) {
      return null;
    }
    return (
      comments?.find((comment) => comment.user?._id === currentUser._id) || null
    );
  }, [comments, currentUser]);

  const { results, voterCount } = useMemo(
    () => aggregateMcPollVotes({ voters, comments, event, currentUser }),
    [voters, comments, event, currentUser],
  );

  const votesLoading = voters === null;

  const handleVote = useCallback(
    async (answerId: string) => {
      if (!votingOpen) {
        return;
      }
      if (!currentUser) {
        onLogin();
        return;
      }

      const wasFirstVote = !hasVoted;
      try {
        const newAnswerIds = await rpc.forumEvents.addMcVote({
          forumEventId: event._id,
          answerId,
        });
        setCurrentUserAnswerIds(newAnswerIds);
        if (wasFirstVote && newAnswerIds.length > 0 && event.post) {
          setCommentFormOpen(true);
        }
        void refetchEvent();
        captureEvent("addMcPollVote", {
          forumEventId: event._id,
          userId: currentUser._id,
          answerId,
        });
      } catch (e) {
        toast.error((e as Error).message || "Something went wrong");
        captureException(e);
      }
    },
    [
      votingOpen,
      currentUser,
      hasVoted,
      event._id,
      event.post,
      onLogin,
      refetchEvent,
      captureEvent,
    ],
  );

  const questionNode = useMemo(() => createQuestionNode(event), [event]);

  const plaintextQuestion = useMemo(
    () =>
      event.pollQuestion?.html ? stripFootnotes(event.pollQuestion.html) : null,
    [event.pollQuestion],
  );

  const commentPrompt = `<blockquote>${plaintextQuestion}</blockquote><p></p>`;

  const forumEventMetadata: ForumEventCommentMetadata = {
    eventFormat: "MC_POLL",
    sticker: null,
    mcPoll: {
      answerIdsWhenPublished: currentUserAnswerIds ?? [],
      latestAnswerIds: null,
      pollQuestionWhenPublished: event.pollQuestion?._id ?? null,
      commentPrompt,
    },
  };

  return (
    <AnalyticsContext pageElementContext="forumEventMcPoll">
      <section
        data-component="ForumEventMcPoll"
        className={clsx(
          "text-(--forum-event-banner-text) mx-auto max-w-full px-2 pb-1",
          className,
        )}
      >
        {questionNode && (
          // The question is plain poll text, not a link: force the (possibly
          // Link-wrapped) question to the banner text colour rather than the
          // site link colour.
          <div
            className="
              font-sans text-center text-[22px] font-bold leading-[1.3]
              max-w-[420px] mx-auto mb-2 text-(--forum-event-banner-text)
              [&_a]:text-(--forum-event-banner-text) [&_a]:no-underline
              hover:[&_a]:no-underline
            "
          >
            {questionNode}
          </div>
        )}
        <div className="min-h-[17px] mb-[18px] text-center text-sm font-medium">
          <PollSubtitle
            endDate={event.endDate ?? null}
            voteCount={voterCount}
            hasVoted={hasVoted}
            resultsVisible={resultsVisible}
            setResultsVisible={setResultsVisible}
            castVerb="Cast"
          />
        </div>

        <div className="flex flex-col gap-2">
          {results.map((row) => {
            const selected = !!currentUserAnswerIds?.includes(row.answer._id);
            const shownVoters = row.voters.slice(-MAX_ROW_AVATARS);
            const overflow = row.voters.length - shownVoters.length;
            return (
              <button
                key={row.answer._id}
                type="button"
                onClick={() => handleVote(row.answer._id)}
                disabled={!votingOpen}
                className={clsx(
                  `relative flex items-center gap-3 px-3.5 py-3 rounded-md
                   overflow-hidden text-left w-full border
                   transition-[background-color,border-color] duration-150`,
                  votingOpen ? "cursor-pointer" : "cursor-default",
                  selected
                    ? `bg-[color-mix(in_oklab,_var(--forum-event-foreground)_8%,_transparent)]
                       border-[color-mix(in_oklab,_var(--forum-event-foreground)_55%,_transparent)]`
                    : `border-[color-mix(in_oklab,_var(--forum-event-foreground)_22%,_transparent)]
                       hover:bg-[color-mix(in_oklab,_var(--forum-event-foreground)_6%,_transparent)]`,
                )}
              >
                {/* Result proportion bar (revealed via "view results") */}
                <div
                  className="
                    absolute inset-0 z-0 transition-[width] duration-[550ms]
                    ease-in-out
                    bg-[color-mix(in_oklab,_var(--forum-event-foreground)_15%,_transparent)]
                  "
                  style={{ width: resultsVisible ? `${row.pct}%` : "0%" }}
                />
                {/* Bullet */}
                <div
                  className={clsx(
                    `relative z-1 flex-none w-5 h-5 border-2 flex items-center
                     justify-center transition-[border-color] duration-150`,
                    multiSelect ? "rounded-[4px]" : "rounded-full",
                    selected
                      ? "border-(--forum-event-foreground)"
                      : "border-[color-mix(in_oklab,_var(--forum-event-foreground)_60%,_transparent)]",
                  )}
                >
                  {selected && (
                    <div
                      className={clsx(
                        "w-2.5 h-2.5 bg-(--forum-event-foreground)",
                        multiSelect ? "rounded-[2px]" : "rounded-full",
                      )}
                    />
                  )}
                </div>
                {/* Label */}
                <div className="relative z-1 flex-1 text-[15px] font-medium">
                  {row.answer.text}
                </div>
                {/* Voter avatars + percentage (only when revealed) */}
                {resultsVisible && (
                  <div className="relative z-1 flex items-center gap-2">
                    {shownVoters.length > 0 && (
                      <div className="flex items-center">
                        {overflow > 0 && (
                          <div
                            className="
                              w-6 h-6 rounded-full flex items-center justify-center
                              text-[9px] font-semibold -mr-2 z-1
                              text-(--forum-event-background)
                              bg-[color-mix(in_oklab,_var(--forum-event-foreground)_70%,_var(--forum-event-background)_30%)]
                            "
                          >
                            +{overflow}
                          </div>
                        )}
                        {shownVoters.map((vote, i) => (
                          <div
                            key={vote.user._id}
                            className={clsx("w-6 h-6", i > 0 && "-ml-2")}
                          >
                            <PollResultIcon
                              vote={vote}
                              event={event}
                              tooltipDisabled={!resultsVisible}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-sm font-bold opacity-95 whitespace-nowrap">
                      {row.pct}%
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {resultsVisible && votesLoading && (
          <Loading colorClassName="bg-gray-1000" className="mt-3" />
        )}

        {/* Anchor for the post-vote comment prompt popover */}
        <ForumEventCommentForm
          isOpen={commentFormOpen}
          setIsOpen={setCommentFormOpen}
          disabled={!event.post}
          comment={currentUserComment}
          successMessage="Success! Open the results to view everyone's votes and comments."
          forumEvent={event}
          onCancel={() => setCommentFormOpen(false)}
          successCallback={refetchComments}
          commentPrompt={commentPrompt}
          forumEventMetadata={forumEventMetadata}
          parentCommentId={event.comment?._id}
          className="block"
          title={() => "What made you vote this way?"}
          subtitle={(post, comment) => (
            <div>
              Your response will appear as a comment on{" "}
              {event.isGlobal ? (
                <Link
                  href={
                    comment
                      ? commentGetPageUrlFromIds({
                          postId: comment.post?._id,
                          commentId: comment._id,
                        })
                      : post
                        ? postGetPageUrl({ post })
                        : "#"
                  }
                  openInNewTab
                >
                  this post
                </Link>
              ) : (
                "this post"
              )}
              .
            </div>
          )}
        >
          <span className="block w-full" />
        </ForumEventCommentForm>
      </section>
    </AnalyticsContext>
  );
}
