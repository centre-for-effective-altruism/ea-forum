import { RefObject, useCallback, useRef, useState } from "react";
import { isMobile } from "@/lib/environment";
import {
  createVoteType,
  type VoteDirection,
  type VoteStrength,
  type VoteType,
} from "@/lib/votes/voteHelpers";
import Transition from "react-transition-group/Transition";
import clsx from "clsx";
import SoftArrowUpIcon from "../Icons/SoftArrowUpIcon";
import VoteStrongHatIcon from "../Icons/VoteStrongHatIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";

// The filled triangle (matching the postitem score arrow), kept in a 3:2 ratio.
const ARROW_WIDTH = 13;
const ARROW_HEIGHT = 9;
// The strong-vote "hat" chevron that sits above the base triangle.
const HAT_WIDTH = 15;
const HAT_HEIGHT = 10;

const orientations = {
  up: null,
  right: "rotate-90",
  down: "rotate-180",
  left: "rotate-270",
} as const;

type Orientation = keyof typeof orientations;

const strongVoteDelayMs = 1000;

export default function VoteButton({
  currentVoteStrength,
  direction,
  orientation,
  onVote,
  dimWhenNotVoted,
  disabled,
  className,
}: Readonly<{
  currentVoteStrength: VoteStrength;
  direction: VoteDirection;
  orientation: Orientation;
  onVote: (voteType: VoteType) => void;
  dimWhenNotVoted?: boolean;
  disabled?: boolean;
  className?: string;
}>) {
  const [votingTransition, setVotingTransition] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [bigVotingTransition, setBigVotingTransition] = useState(false);
  const [bigVoteCompleted, setBigVoteCompleted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const voted = currentVoteStrength !== "neutral";
  const bigVoted = currentVoteStrength === "big";
  const upvote = direction === "Upvote";

  // The darker vote colour (a small vote, and the strong-vote "hat"); the base
  // triangle lightens to the *-light variant once strong-voted.
  const strongColor = upvote ? "text-primary" : "text-error";
  const baseColor = bigVoted
    ? upvote
      ? "text-primary-light"
      : "text-error-light"
    : strongColor;

  const wrappedVote = useCallback(
    (voteStrength: VoteStrength) => {
      const voteType =
        voteStrength === currentVoteStrength
          ? "neutral"
          : createVoteType(voteStrength, direction);
      onVote(voteType);
    },
    [onVote, currentVoteStrength, direction],
  );

  const clearState = useCallback(() => {
    if (votingTransition) {
      clearTimeout(votingTransition);
    }
    setBigVotingTransition(false);
    setBigVoteCompleted(false);
  }, [votingTransition]);

  // Only used on desktop
  const onMouseDown = useCallback(() => {
    if (!isMobile()) {
      setBigVotingTransition(true);
      setVotingTransition(
        setTimeout(() => {
          setBigVoteCompleted(true);
        }, strongVoteDelayMs),
      );
    }
  }, []);

  // Only used on desktop
  const onMouseUp = useCallback(() => {
    if (!isMobile()) {
      wrappedVote(bigVoteCompleted ? "big" : "small");
      clearState();
    }
  }, [bigVoteCompleted, wrappedVote, clearState]);

  // Only used on mobile
  const onPress = useCallback(() => {
    if (isMobile()) {
      // This causes the following behavior (repeating after 3rd click):
      //   1st click: small upvote
      //   2nd click: big upvote
      //   3rd click: cancel big upvote (i.e. going back to no vote)
      wrappedVote(voted ? "big" : "small");
      clearState();
    }
  }, [wrappedVote, voted, clearState]);

  return (
    <Tooltip
      title={
        disabled ? (
          <Type>You do not have permission</Type>
        ) : (
          <Type>
            <strong>{direction}</strong>
            <br />
            Is this a valuable contribution?
            <br />
            <em>
              Click and hold for a strong {direction.toLowerCase()} (tap twice on
              mobile)
            </em>
          </Type>
        )
      }
      tooltipClassName="max-w-[250px]!"
      className={clsx(
        "flex items-center",
        disabled && "pointer-events-none cursor-not-allowed",
      )}
    >
      <button
        data-component="VoteButton"
        onMouseOut={clearState}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onClick={onPress}
        className={clsx(
          "relative cursor-pointer flex items-center justify-center p-0.5",
          orientations[orientation],
          className,
        )}
      >
        {/* Base triangle. When strong-voted it lightens, and a darker "hat"
            chevron stacks on top of it (see the strong-vote overlay below). */}
        <SoftArrowUpIcon
          width={ARROW_WIDTH}
          height={ARROW_HEIGHT}
          className={clsx(
            voted && baseColor,
            !voted && dimWhenNotVoted && "opacity-70",
            !voted && "hover:text-gray-600",
          )}
        />
        {/* Strong-vote "hat": an upward chevron above the base triangle, darker
            so the darker arrow sits on top. */}
        <Transition
          in={!!(bigVotingTransition || bigVoted)}
          timeout={strongVoteDelayMs}
          nodeRef={ref as unknown as RefObject<HTMLElement>}
        >
          {(state) => (
            <span
              ref={ref}
              className={clsx(
                // Geometrically centered, but a hair left of -translate-x-1/2
                // reads as better optically aligned over the triangle.
                "pointer-events-none absolute left-1/2 -translate-x-[calc(50%+0.5px)] -top-[4px]",
                (bigVoteCompleted || bigVoted) && strongColor,
                state === "entering" || state === "entered"
                  ? "opacity-100"
                  : "opacity-0",
                state === "exiting"
                  ? "[transition:opacity_150ms_cubic-bezier(0.74,-0.01,1,1)_0ms]"
                  : "[transition:opacity_1000ms_cubic-bezier(0.74,-0.01,1,1)_0ms]",
              )}
            >
              <VoteStrongHatIcon width={HAT_WIDTH} height={HAT_HEIGHT} />
            </span>
          )}
        </Transition>
      </button>
    </Tooltip>
  );
}
