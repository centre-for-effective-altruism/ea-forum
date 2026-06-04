"use client";

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { captureException } from "@sentry/nextjs";
import type { ForumEventBase } from "@/lib/forumEvents/forumEventQueries";
import type { CommentListItem } from "@/lib/comments/commentLists";
import type { UserBase } from "@/lib/users/userQueries";
import {
  ForumEventCommentMetadata,
  getForumEventVoteCount,
  getForumEventVoteForUser,
} from "@/lib/forumEvents/forumEventHelpers";
import {
  clusterForumEventVotes,
  createQuestionNode,
  NUM_TICKS,
  stripFootnotes,
} from "@/lib/utils/pollHelpers";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { commentGetPageUrlFromIds } from "@/lib/comments/commentHelpers";
import { AnalyticsContext, useTracking } from "@/lib/analyticsEvents";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { postGetPageUrl } from "@/lib/posts/postsHelpers";
import { rpc } from "@/lib/rpc";
import ChevronRightIcon from "@heroicons/react/16/solid/ChevronRightIcon";
import CommentIcon from "@heroicons/react/24/outline/ChatBubbleLeftIcon";
import ChevronLeftIcon from "@heroicons/react/16/solid/ChevronLeftIcon";
import UserCircleIcon from "@heroicons/react/24/outline/UserCircleIcon";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import clsx from "clsx";
import ForumEventCommentForm from "../ForumEvents/ForumEventCommentForm";
import UserProfileImage from "../UserProfileImage";
import PollResultIcon from "./PollResultIcon";
import PollSubtitle from "./PollSubtitle";
import PollButton from "./PollButton";
import Tooltip from "../Tooltip";
import Loading from "../Loading";
import Type from "../Type";
import Link from "../Link";

type AddVoteData = Parameters<typeof rpc.forumEvents.addVote>[0];

const SLIDER_MAX_WIDTH = 880;
const RESULT_ICON_MAX_HEIGHT = 32;
const USER_IMAGE_SIZE = 30;
const DEFAULT_STACK_IMAGES = 20;
const GAP = "calc(0.6% + 4px)"; // Accounts for 2px outline
const CENTRAL_TICK_INDEX = Math.floor(NUM_TICKS / 2);

export default function ForumEventPoll({
  event,
  hideViewResults,
  className,
}: Readonly<{
  event: ForumEventBase;
  hideViewResults?: boolean;
  className?: string;
}>) {
  const {onLogin} = useLoginPopoverContext();
  const {currentUser} = useCurrentUser();
  const {captureEvent} = useTracking();

  const initialUserVotePos = getForumEventVoteForUser(event, currentUser);
  const initialBucketIndex = initialUserVotePos !== null
    ? Math.round(initialUserVotePos * (NUM_TICKS - 1))
    : CENTRAL_TICK_INDEX;

  const [commentFormOpen, setCommentFormOpen] = useState(false);
  const [maxStackSize, setMaxStackSize] = useState(DEFAULT_STACK_IMAGES);
  // The bucket that the current user's vote is in (including if the vote is
  // currently being dragged)
  const [currentBucketIndex, setCurrentBucketIndex] = useState(initialBucketIndex);
  // The logical x-position of the current vote (equal to
  // `currentBucketIndex / (NUM_TICKS - 1)`)
  const [currentUserVote, setCurrentUserVote] = useState(initialUserVotePos);
  // Whether or not the poll results (i.e. other users' votes) are visible.
  // They are hidden until the user clicks on "view results".
  const [resultsVisible, setResultsVisible] = useState(false);
  const [voteCount, setVoteCount] = useState(getForumEventVoteCount(event));

  const hasVoted = currentUserVote !== null;
  const votingOpen = !event.endDate || new Date(event.endDate) > new Date();

  // Whether or not the user is currently dragging their vote
  const isDragging = useRef(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const tickRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tickPositions = useRef<number[]>([]);

  const [voters, setVoters] = useState<UserBase[] | null>(null);
  const [comments, setComments] = useState<CommentListItem[] | null>(null);

  const refetchVoters = useCallback(async () => {
    try {
      const voterIds = Object.keys(event.publicData || {}).slice(0, 1000);
      const voters = voterIds.length
        ? await rpc.users.listByIds({ userIds: voterIds })
        : {};
      setVoters(Object.values(voters));
    } catch (e) {
      console.error("Error fetching poll voters:", e);
      captureException(e);
    }
  }, [event.publicData]);

  useEffect(() => {
    void refetchVoters();
  }, [refetchVoters]);

  const refetchComments = useCallback(async () => {
    try {
      const comments = await rpc.comments.listByForumEvent({
        forumEventId: event._id,
      });
      setComments(comments);
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
    return comments?.find(comment => comment.user?._id === currentUser._id) || null;
  }, [comments, currentUser]);

  const voteClusters = useMemo(
    () => clusterForumEventVotes({ voters, comments, event, currentUser }),
    [voters, event, currentUser, comments],
  );

  const votesLoading = voters === null;

  const toggleCommentFormOpen = useCallback(() => {
    setCommentFormOpen((isOpen) => {
      const newState = !isOpen;
      captureEvent("forumEventCommentFormToggled", { newState });
      return newState;
    });
  }, [captureEvent])

  const refetch = useCallback(() => {}, []); // TODO

  /**
   * When the user clicks the "x" icon, or when a logged out user tries to vote,
   * delete their vote data
   */
  const clearVote = useCallback(
    async (e?: ReactPointerEvent) => {
      try {
        e?.stopPropagation();
        if (currentUser && event) {
          await rpc.forumEvents.removeVote({ forumEventId: event._id });
          setVoteCount((count) => count - 1);
          setCommentFormOpen(false);
          refetch();
          captureEvent("removeForumEventVote", {
            forumEventId: event._id,
            userId: currentUser._id,
          });
        }
        setCurrentBucketIndex(CENTRAL_TICK_INDEX);
        setCurrentUserVote(null);
      } catch (e) {
        toast.error((e as Error).message || "Something went wrong");
        captureException(e);
      }
    },
    [currentUser, event, refetch, captureEvent],
  );

  /**
   * When the user pointerdowns on their vote circle, start dragging it
   */
  const startDragVote = useCallback((e: ReactPointerEvent) => {
    if (votingOpen) {
      e.preventDefault();
      isDragging.current = true;
    }
  }, [votingOpen]);

  /**
   * When the user drags their vote, update its x position
   */
  useEffect(() => {
    const updateVotePos = (e: PointerEvent) => {
      if (!isDragging.current || !sliderRef.current || !votingOpen) {
        return;
      }

      const sliderRect = sliderRef.current.getBoundingClientRect();
      const sliderWidth = sliderRect.right - sliderRect.left;
      if (e.clientX < sliderRect.left) {
        setCurrentBucketIndex(0);
        return;
      } else if (e.clientX > sliderRect.right) {
        setCurrentBucketIndex(NUM_TICKS - 1);
        return;
      }

      const rawVotePos = (e.clientX - sliderRect.left) / sliderWidth;
      const bucketIndex = Math.round(rawVotePos * (NUM_TICKS - 1));
      setCurrentBucketIndex(bucketIndex);
    }
    window.addEventListener("pointermove", updateVotePos);
    return () => window.removeEventListener("pointermove", updateVotePos);
  }, [votingOpen]);

  /**
   * When the user is done dragging their vote:
   * - If this is the user's initial vote, save the vote
   * - If we have a postId (because we're on the post page), save the vote
   * - Otherwise (we're on the home page), open the post selection modal
   */
  useEffect(() => {
    const saveVotePos = async () => {
      if (!isDragging.current || !event || !votingOpen) {
        return;
      }

      isDragging.current = false;

      if (!currentUser) {
        void clearVote()
        return;
      }

      try {
        const newVotePos = currentBucketIndex / (NUM_TICKS - 1);
        const voteData: AddVoteData = {
          forumEventId: event._id,
          x: newVotePos,
        };
        if (!hasVoted) {
          if (event.post) {
            setCommentFormOpen(true);
          }
          setVoteCount((count) => count + 1);
          setCurrentUserVote(newVotePos);
          await rpc.forumEvents.addVote(voteData);
          refetch?.();
          captureEvent("addForumEventVote", {
            userId: currentUser._id,
            ...voteData,
          });
          return;
        }
        const delta =
          newVotePos - (currentUserVote ?? (CENTRAL_TICK_INDEX / (NUM_TICKS - 1)));
        if (delta) {
          voteData.delta = delta;
          setCurrentUserVote(newVotePos);
          const postIds = {
            ...(event.post?._id && { postIds: [event.post._id] }),
          };
          await rpc.forumEvents.addVote({
            ...voteData,
            ...postIds,
          });
          refetch?.();
          captureEvent("addForumEventVote", {
            userId: currentUser._id,
            ...voteData,
            ...postIds,
          });
        }
      } catch (e) {
        setCurrentBucketIndex(initialBucketIndex);
        setCurrentUserVote(initialUserVotePos);
        toast((e as Error).message);
        captureException(e);
      }
    }
    window.addEventListener("pointerup", saveVotePos);
    return () => window.removeEventListener("pointerup", saveVotePos);
  }, [
    event,
    clearVote,
    currentBucketIndex,
    currentUser,
    currentUserVote,
    hasVoted,
    initialBucketIndex,
    initialUserVotePos,
    votingOpen,
    captureEvent,
    refetch,
  ]);

  const onIncreaseStackSize = useCallback(
    () => setMaxStackSize((prev) => prev + 10),
    [],
  );

  const questionNode = useMemo(() => createQuestionNode(event), [event]);

  const plaintextQuestion = useMemo(
    () => (event.pollQuestion?.html ? stripFootnotes(event.pollQuestion.html) : null),
    [event.pollQuestion?.html]
  );

  const commentPrompt = `<blockquote>${plaintextQuestion}</blockquote><p></p>`;

  const forumEventMetadata: ForumEventCommentMetadata = {
    eventFormat: "POLL",
    sticker: null,
    poll: {
      voteWhenPublished: currentUserVote ?? 0.5,
      latestVote: null,
      pollQuestionWhenPublished: event.pollQuestion?._id ?? null,
      commentPrompt,
    },
  };

  // The position of the current vote as a percentage along the slider
  const votePos =
    tickPositions.current.length && tickPositions.current[currentBucketIndex] !== undefined
      ? tickPositions.current[currentBucketIndex]
      // Fall back to naive approximate calculation so there isn't a big jump after
      // the first render
      : (currentBucketIndex / (NUM_TICKS - 1)) * 100;

  return (
    <AnalyticsContext pageElementContext="forumEventPoll">
      <section
        data-component="ForumEventPoll"
        className={clsx(
          "text-center text-(--forum-event-banner-text) mx-auto max-w-full",
          "px-2 pb-4",
          className,
        )}
      >
        {questionNode &&
          <Type style="pollQuestion" className="max-w-[730px] mb-[13px] mx-auto">
            {questionNode}
          </Type>
        }
        <div className="min-h-[17px] mb-[14px]">
          {!hideViewResults && (
            <Type
              className={clsx(
                "flex",
                resultsVisible ? "justify-end" : "justify-center",
              )}
              cssStyle={{ maxWidth: SLIDER_MAX_WIDTH }}
            >
              <PollSubtitle
                endDate={event.endDate ?? null}
                voteCount={voteCount}
                hasVoted={hasVoted}
                resultsVisible={resultsVisible}
                setResultsVisible={setResultsVisible}
              />
            </Type>
          )}
        </div>
        <div className="flex justify-center">
          <div
            className="grow relative pt-2 px-4 overflow-hidden"
            style={{ maxWidth: `min(${SLIDER_MAX_WIDTH}px, 100%)` }}
          >
            <div
              className="
                flex justify-between max-w-full relative
                transition-[max-height_0.5s_ease-in-out,_opacity_0.5s_ease-in-out]
              "
              style={{
                gap: GAP,
                maxHeight: resultsVisible ? maxStackSize * RESULT_ICON_MAX_HEIGHT : 0,
                opacity: resultsVisible ? 1 : 0,
                marginBottom: (USER_IMAGE_SIZE / 2) + 12,
              }}
            >
              {voteClusters.map((cluster) => (
                <div
                  key={cluster.center}
                  className="flex flex-1 flex-col items-center justify-end relative"
                >
                  {cluster.votes.length > maxStackSize && (
                    <div
                      onClick={onIncreaseStackSize}
                      className="
                        cursor-pointer relative flex items-center justify-center
                        rounded-[50%] overflow-hidden aspect-square w-[calc(100%+4px)]
                        text-(--forum-event-background) font-[600]
                        bg-[color-mix(in_oklab,_var(--forum-event-foreground)_50%,_var(--forum-event-background)_50%)]
                      "
                    >
                      <span
                        className="
                          absolute whitespace-nowrap top-[50%] left-[50%]
                          overflow-hidden text-ellipsis font-sans font-[500]
                          transform-[translate(-50%,-50%)]
                          sm:transform-[translate(-54%,-54%)]
                          text-[7px] sm:text-[10px] md:text-[14px]
                        "
                      >
                        +{cluster.votes.length - maxStackSize}
                      </span>
                    </div>
                  )}
                  {cluster.votes.slice(-maxStackSize).map((vote) => (
                    <PollResultIcon
                      key={vote.user._id}
                      vote={vote}
                      event={event}
                      tooltipDisabled={!resultsVisible}
                    />
                  ))}
                </div>
              ))}
            </div>
            {resultsVisible && votesLoading &&
              <Loading
                colorClassName="bg-gray-1000"
                style={{ marginBottom: (USER_IMAGE_SIZE / 2) + 24 }}
              />
            }
            <div
              ref={sliderRef}
              className="
                relative w-full h-[1px] bg-(--forum-event-foreground) rounded mb-4
                transition-[transform_0.5s_ease-in-out]
              "
            >
              {/* Ticks */}
              <div
                className="absolute left-0 right-0 flex group"
                style={{
                  top: -(USER_IMAGE_SIZE / 2),
                  height: USER_IMAGE_SIZE,
                  paddingTop: (USER_IMAGE_SIZE - 6) / 2,
                  paddingBottom: (USER_IMAGE_SIZE - 6) / 2,
                  gap: GAP,
                }}
              >
                {Array.from({ length: NUM_TICKS }, (_, i) => i).map((tickIndex) => (
                  <div
                    key={tickIndex}
                    ref={(el) => {tickRefs.current[tickIndex] = el}}
                    className={clsx(
                      "flex-1 relative duration-200",
                      "opacity-0 group-hover:opacity-100 transition-opacity",
                      "before:absolute before:top-px before:bottom-0",
                      "before:left-1/2 before:w-px before:content-['']",
                      "before:bg-(--forum-event-foreground)",
                      "before:opacity-30 before:-translate-x-1/2",
                      isDragging.current && "opacity-100!",
                      tickIndex === CENTRAL_TICK_INDEX && `
                        opacity-30 before:height-[125%] before:-top-[5%]
                        before:opacity-100 before:bg-(--forum-event-foreground)
                      `,
                    )}
                  />
                ))}
                {/* User Vote */}
                <AnalyticsContext
                  pageElementContext="forumEventUserIcon"
                  forumEventId={event._id}
                >
                  <div
                    className={clsx(
                      "absolute top-0 z-15 touch-none transform-[translateX(-50%)]",
                      "opacity-60 hover:opacity-100",
                      votingOpen ? "cursor-grab" : "cursor-default",
                      isDragging.current && "cursor-grabbing!",
                      hasVoted && "opacity-100!",
                    )}
                    style={{ left: `${votePos}%` }}
                  >
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
                      title={() => "What made you vote this way?"}
                      subtitle={(post, comment) => (
                        <div>
                          Your response will appear as a comment on{" "}
                          {event.isGlobal
                            ? (
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
                            )
                            : "this post"
                          }
                          , and show next to your avatar in the results.
                        </div>
                      )}
                    >
                      <Tooltip
                        title={
                          (votingOpen && !hasVoted) && (
                            <>
                              <Type
                                style="bodyXHeavy"
                                className="leading-[140%] mb-1"
                              >
                                Click and drag to vote
                              </Type>
                              <Type
                                style="bodyMedium"
                                className="leading-[140%]"
                              >
                                Votes are non-anonymous and can be changed at any time
                              </Type>
                            </>
                          )
                        }
                        disabled={commentFormOpen}
                        className="group/user-icon"
                      >
                        {currentUser ? (
                          <span onPointerDown={startDragVote}>
                            <UserProfileImage
                              user={currentUser}
                              size={USER_IMAGE_SIZE}
                              className="[outline:2px_solid_color-mix(in_oklab,_var(--forum-event-foreground)_50%,_var(--forum-event-background)_50%)]"
                            />
                          </span>
                        ) : (
                          <UserCircleIcon
                            onPointerDown={onLogin}
                            className="
                              bg-[radial-gradient(var(--color-always-black)_50%,transparent_50%)]
                              text-(--forum-event-foreground) w-[44px] rounded-full
                              -mt-[8px]
                            "
                          />
                        )}
                        {votingOpen && hasVoted &&
                          <PollButton
                            Icon={XMarkIcon}
                            onClick={clearVote}
                            className="
                              absolute top-[-5px] right-[-5px] transition-opacity
                              opacity-0 group-hover/user-icon:opacity-100
                            "
                          />
                        }
                        {event.post && hasVoted &&
                          <PollButton
                            Icon={CommentIcon}
                            onClick={toggleCommentFormOpen}
                            className="
                              absolute top-[22px] right-[-5px] transition-opacity
                              opacity-0 group-hover/user-icon:opacity-100
                            "
                          />
                        }
                      </Tooltip>
                    </ForumEventCommentForm>
                  </div>
                </AnalyticsContext>
              </div>
              {/* Arrows */}
              <ChevronLeftIcon
                className={clsx(
                  "absolute -top-[7px] w-[15px] text-(--forum-event-foreground)",
                  "left-0 -translate-x-[5px]",
                )}
              />
              <ChevronRightIcon
                className={clsx(
                  "absolute -top-[7px] w-[15px] text-(--forum-event-foreground)",
                  "right-0 translate-x-[5px]",
                )}
              />
            </div>
            <Type
              style="bodyMedium"
              className="flex justify-between mt-[22px] mb-[6px]"
            >
              <div>{event.pollDisagreeWording}</div>
              <div>{event.pollAgreeWording}</div>
            </Type>
          </div>
        </div>
      </section>
    </AnalyticsContext>
  );
}
