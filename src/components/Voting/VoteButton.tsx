import { RefObject, useCallback, useRef, useState } from "react";
import { isMobile } from "@/lib/environment";
import {
  createVoteType,
  type VoteDirection,
  type VoteStrength,
  type VoteType,
} from "@/lib/votes/voteHelpers";
import ChevronUpIcon from "@heroicons/react/16/solid/ChevronUpIcon";
import Transition from "react-transition-group/Transition";
import clsx from "clsx";
import Tooltip from "../Tooltip";
import Type from "../Type";

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
  large,
  className,
}: Readonly<{
  currentVoteStrength: VoteStrength;
  direction: VoteDirection;
  orientation: Orientation;
  onVote: (voteType: VoteType) => void;
  dimWhenNotVoted?: boolean;
  large?: boolean;
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
        <Type>
          <strong>Overall karma: {direction}</strong>
          <br />
          Is this a valuable contribution?
          <br />
          <em>
            For strong {direction.toLowerCase()}, click-and-hold
            <br />
            (Press twice on mobile)
          </em>
        </Type>
      }
      className="flex items-center"
    >
      <button
        data-component="VoteButton"
        onMouseOut={clearState}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onClick={onPress}
        className={clsx(
          "relative cursor-pointer",
          orientations[orientation],
          className,
        )}
      >
        <ChevronUpIcon
          width={large ? 20 : 16}
          height={large ? 20 : 16}
          className={clsx(
            voted && (upvote ? "text-primary" : "text-error"),
            !voted && dimWhenNotVoted && "opacity-70",
          )}
        />
        <Transition
          in={!!(bigVotingTransition || bigVoted)}
          timeout={strongVoteDelayMs}
          nodeRef={ref as unknown as RefObject<HTMLElement>}
        >
          {(state) => (
            <ChevronUpIcon
              ref={ref}
              width={large ? 30 : 24}
              height={large ? 30 : 24}
              className={clsx(
                "pointer-events-none absolute",
                large ? "-top-[9px] -left-[5px]" : "-top-[7px] -left-[4px]",
                (bigVoteCompleted || bigVoted) &&
                  (upvote ? "text-primary-light" : "text-error-light"),
                state === "entering" || state === "entered"
                  ? "opacity-100"
                  : "opacity-0",
                state === "exiting"
                  ? "[transition:opacity_150ms_cubic-bezier(0.74,-0.01,1,1)_0ms]"
                  : "[transition:opacity_1000ms_cubic-bezier(0.74,-0.01,1,1)_0ms]",
              )}
            />
          )}
        </Transition>
      </button>
    </Tooltip>
  );
}
