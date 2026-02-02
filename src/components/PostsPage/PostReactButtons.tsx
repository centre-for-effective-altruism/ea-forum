"use client";

import { useCallback, type FC, type ReactNode } from "react";
import type { CurrentUser } from "@/lib/users/currentUser";
import type { PostDisplay } from "@/lib/posts/postQueries";
import type { PostReactors } from "@/lib/votes/fetchReactors";
import { useLoginPopoverContext } from "@/lib/hooks/useLoginPopoverContext";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  countCurrentReactions,
  formatReactorNames,
  getReactionMutuallyExclusivePartner,
  isReactionSelected,
  ReactionOption,
} from "@/lib/votes/reactions";
import clsx from "clsx";
import AddReactionIcon from "../Icons/Reactions/AddReactionIcon";
import ReactionPalette from "../Voting/ReactionPalette";
import Dropdown from "../Dropdown/Dropdown";
import Tooltip from "../Tooltip";
import Type from "../Type";
import { onVoteAction } from "@/lib/votes/voteActions";

const AnonymousTooltipContent: FC<{
  reaction: ReactionOption;
  count: number;
}> = ({ reaction, count }) => {
  return (
    <Type style="bodySmall">
      <div>
        {count === 1 ? "1 person" : `${count} people`}{" "}
        <span className="text-gray-400">reacted with</span>
      </div>
      <div className="flex items-center justify-center gap-1">
        <reaction.Component className="text-primary-light w-4" /> {reaction.label}
      </div>
    </Type>
  );
};

const PublicTooltipContent: FC<{
  currentUser: CurrentUser | null;
  reaction: ReactionOption;
  isSelected: boolean;
  reactors?: Record<string, string[]>;
}> = ({ currentUser, reaction, isSelected, reactors }) => {
  let displayNames = reactors?.[reaction.name] ?? [];
  if (currentUser) {
    const { displayName } = currentUser;
    displayNames = displayNames.filter((name) => name !== displayName);
    if (isSelected) {
      displayNames = ["You", ...displayNames];
    }
  }
  return (
    <Type style="bodySmall">
      {displayNames.length > 0 && (
        <div>
          {formatReactorNames(displayNames)}{" "}
          <span className="text-gray-400">reacted with</span>
        </div>
      )}
      <div className="flex items-center justify-center gap-1">
        <reaction.Component className="text-primary-light w-4" /> {reaction.label}
      </div>
    </Type>
  );
};

const ReactionButton: FC<{
  onClick?: () => void;
  children: ReactNode;
}> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="
      cursor-pointer flex items-center gap-1 user-select-none h-6 px-1
      hover:bg-gray-100 rounded
    "
  >
    {children}
  </button>
);

export default function PostReactButtons({
  post,
  reactors,
}: {
  post: PostDisplay;
  reactors: PostReactors;
}) {
  const { currentUser } = useCurrentUser();
  const { onSignup } = useLoginPopoverContext();
  const currentUserVote = post.votes?.[0]?.voteType;
  const currentUserExtendedVote = post.votes?.[0]?.extendedVoteType;

  const onSelectReaction = useCallback(
    async (reaction: ReactionOption) => {
      if (!currentUser) {
        onSignup();
        return;
      }

      const extendedVote: Record<string, boolean> = {
        ...currentUserExtendedVote,
        [reaction.name]: !isReactionSelected(currentUserExtendedVote, reaction),
      };
      const partner = getReactionMutuallyExclusivePartner(reaction.name);
      if (partner && extendedVote[reaction.name]) {
        extendedVote[partner] = false;
      }

      await onVoteAction({
        collectionName: "Posts",
        documentId: post._id,
        voteType: currentUserVote ?? "neutral",
        extendedVote,
      });
    },
    [currentUser, onSignup, post._id, currentUserVote, currentUserExtendedVote],
  );

  const reactions = countCurrentReactions(post.extendedScore);
  return (
    <div className="flex items-center gap-[2px]">
      {reactions.map(({ reaction, score, anonymous }) => {
        const isSelected = false; // TODO
        return (
          <Tooltip
            key={reaction.name}
            placement="top"
            tooltipClassName={clsx(
              "max-w-full text-center",
              score > 10 ? "w-[400px]" : "w-[190px]",
            )}
            title={
              anonymous ? (
                <AnonymousTooltipContent reaction={reaction} count={score} />
              ) : (
                <PublicTooltipContent
                  currentUser={currentUser}
                  reaction={reaction}
                  isSelected={isSelected}
                  reactors={reactors}
                />
              )
            }
          >
            <ReactionButton onClick={onSelectReaction.bind(null, reaction)}>
              <reaction.Component className="w-4 text-primary" />
              <span className="text-gray-600">{score}</span>
            </ReactionButton>
          </Tooltip>
        );
      })}
      <Dropdown menu={<ReactionPalette />} placement="bottom-start">
        <Tooltip placement="top" title={<Type style="bodySmall">Add reaction</Type>}>
          <ReactionButton>
            <AddReactionIcon className="w-[18px]" />
          </ReactionButton>
        </Tooltip>
      </Dropdown>
    </div>
  );
}
