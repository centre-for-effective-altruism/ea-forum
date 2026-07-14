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

  // `selectedAnswerIds` is the reader's current (possibly unsubmitted) choice;
  // `submittedAnswerIds` is what's actually saved on the server. For
  // single-select they move together (a click submits immediately); for
  // multi-select the selection is built up locally and committed on "Submit".
  const [selectedAnswerIds, setSelectedAnswerIds] = useState<string[]>(
    () => getMcPollVoteForUser(event, currentUser) ?? [],
  );
  const [submittedAnswerIds, setSubmittedAnswerIds] = useState<string[]>(
    () => getMcPollVoteForUser(event, currentUser) ?? [],
  );
  const [resultsVisible, setResultsVisible] = useState(false);
  const [commentFormOpen, setCommentFormOpen] = useState(false);
  const [voters, setVoters] = useState<UserBase[] | null>(null);
  const [comments, setComments] = useState<CommentListItem[] | null>(null);

  const hasVoted = submittedAnswerIds.length > 0;
  const votingOpen = !event.endDate || new Date(event.endDate) > new Date();

  const pollData = useMemo(
    () => getMcPollPublicData({ publicData: event.publicData }),
    [event.publicData],
  );
  const multiSelect = pollData.multiSelect;

  // Key the voter fetch on the *set* of voter ids, so changing which answers
  // you've picked (which mutates publicData.votes values but not its keys)
  // doesn't re-download the whole voter list.
  const voterIdsKey = useMemo(
    () => Object.keys(pollData.votes).slice(0, 1000).join(","),
    [pollData],
  );
  const refetchVoters = useCallback(async () => {
    try {
      const voterIds = voterIdsKey ? voterIdsKey.split(",") : [];
      const result = voterIds.length
        ? await rpc.users.listByIds({ userIds: voterIds })
        : {};
      setVoters(Object.values(result));
    } catch (e) {
      console.error("Error fetching poll voters:", e);
      captureException(e);
    }
  }, [voterIdsKey]);

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

  const submitVote = useCallback(
    async (answerIds: string[], autoPromptComment: boolean) => {
      if (!currentUser) {
        onLogin();
        return;
      }
      try {
        const saved = await rpc.forumEvents.addMcVote({
          forumEventId: event._id,
          answerIds,
        });
        setSelectedAnswerIds(saved);
        setSubmittedAnswerIds(saved);
        if (autoPromptComment && saved.length > 0 && event.post) {
          setCommentFormOpen(true);
        }
        void refetchEvent();
        captureEvent("addMcPollVote", {
          forumEventId: event._id,
          userId: currentUser._id,
          answerIds: saved,
        });
      } catch (e) {
        toast.error((e as Error).message || "Something went wrong");
        captureException(e);
      }
    },
    [currentUser, event._id, event.post, onLogin, refetchEvent, captureEvent],
  );

  const handleSelect = useCallback(
    (answerId: string) => {
      if (!votingOpen) {
        return;
      }
      if (!currentUser) {
        onLogin();
        return;
      }
      if (multiSelect) {
        // Toggle locally; committed when the reader clicks "Submit vote".
        setSelectedAnswerIds((prev) =>
          prev.includes(answerId)
            ? prev.filter((id) => id !== answerId)
            : [...prev, answerId],
        );
      } else {
        // Single-select: one decisive click, submit and prompt for a comment.
        void submitVote([answerId], true);
      }
    },
    [votingOpen, currentUser, multiSelect, onLogin, submitVote],
  );

  const handleSubmit = useCallback(
    () => submitVote(selectedAnswerIds, true),
    [submitVote, selectedAnswerIds],
  );

  // Submit (multi-select) is enabled only when there's a non-empty selection
  // that differs from what's already been submitted.
  const selectionChanged =
    selectedAnswerIds.length !== submittedAnswerIds.length ||
    selectedAnswerIds.some((id) => !submittedAnswerIds.includes(id));
  const submitDisabled = selectedAnswerIds.length === 0 || !selectionChanged;

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
      answerIdsWhenPublished: submittedAnswerIds,
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
            const selected = selectedAnswerIds.includes(row.answer._id);
            const shownVoters = row.voters.slice(-MAX_ROW_AVATARS);
            const overflow = row.voters.length - shownVoters.length;
            return (
              <button
                key={row.answer._id}
                type="button"
                onClick={() => handleSelect(row.answer._id)}
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

        {/* Multi-select commits the selection via "Submit vote", which then
            opens the comment prompt. Single-select commits on click and
            auto-opens the prompt (see handleSelect), so it only needs an
            invisible anchor for the popover. */}
        <div className="flex justify-end mt-4">
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
          className="inline-block"
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
          {multiSelect && votingOpen ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              className={clsx(
                `px-4 py-1.5 rounded-md text-sm font-semibold
                 bg-(--forum-event-foreground) text-(--forum-event-background)`,
                submitDisabled
                  ? "opacity-50 cursor-default"
                  : "cursor-pointer hover:opacity-90",
              )}
            >
              Submit vote
            </button>
          ) : (
            <span className="block" />
          )}
        </ForumEventCommentForm>
        </div>
      </section>
    </AnalyticsContext>
  );
}
