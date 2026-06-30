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
import { SOFT_ARROW_PATH } from "../Icons/SoftArrowUpIcon";
import Tooltip from "../Tooltip";
import Type from "../Type";

// Rendered size of the filled triangle (matching the postitem score arrow),
// drawn in SoftArrowUpIcon's "0 0 9 6" viewBox.
const ARROW_WIDTH = 13;
const ARROW_HEIGHT = 9;
// The strong-vote "hat" traces the triangle's two upper edges, lifted above it
// (in viewBox units) — drawn in the SAME svg so it can't drift relative to the
// triangle when rasterized at fractional pixel positions.
const HAT_PATH = "M0.844665 4.93186 L4.5 0.85 L8.15534 4.93186";
const HAT_LIFT = 3.4;

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
  const ref = useRef<SVGSVGElement>(null);

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
        {/* Triangle (always shown) and the strong-vote "hat" in ONE svg, so the
            hat can't drift from the triangle when rasterized at fractional pixel
            positions. The base triangle lightens when strong-voted; the darker
            hat chevron — the triangle's own upper edges, lifted above it — fades
            in on top. */}
        <Transition
          in={!!(bigVotingTransition || bigVoted)}
          timeout={strongVoteDelayMs}
          nodeRef={ref as unknown as RefObject<HTMLElement>}
        >
          {(state) => (
            <svg
              ref={ref}
              width={ARROW_WIDTH}
              height={ARROW_HEIGHT}
              viewBox="0 0 9 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={clsx(
                "overflow-visible",
                !voted && dimWhenNotVoted && "opacity-70",
                !voted && "hover:text-gray-600",
              )}
            >
              <path
                d={SOFT_ARROW_PATH}
                fill="currentColor"
                className={clsx(voted && baseColor)}
              />
              <g
                transform={`translate(0 -${HAT_LIFT})`}
                className={clsx(
                  (bigVoteCompleted || bigVoted) && strongColor,
                  state === "entering" || state === "entered"
                    ? "opacity-100"
                    : "opacity-0",
                  state === "exiting"
                    ? "[transition:opacity_150ms_cubic-bezier(0.74,-0.01,1,1)_0ms]"
                    : "[transition:opacity_1000ms_cubic-bezier(0.74,-0.01,1,1)_0ms]",
                )}
              >
                <path
                  d={HAT_PATH}
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
          )}
        </Transition>
      </button>
    </Tooltip>
  );
}
