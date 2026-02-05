import type { FC, ReactNode } from "react";
import type { CurrentUser } from "@/lib/users/currentUser";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  countCurrentReactions,
  formatReactorNames,
  isReactionSelected,
  ReactionOption,
} from "@/lib/votes/reactions";
import clsx from "clsx";
import AddReactionIcon from "../Icons/Reactions/AddReactionIcon";
import ReactionPalette from "./ReactionPalette";
import Dropdown from "../Dropdown/Dropdown";
import Tooltip from "../Tooltip";
import Type from "../Type";

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
  reactors?: Record<string, string[]> | null;
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
  isSelected?: boolean;
  children: ReactNode;
}> = ({ onClick, isSelected, children }) => (
  <button
    onClick={onClick}
    className={clsx(
      "cursor-pointer flex items-center gap-1 user-select-none h-6 px-1 rounded",
      isSelected
        ? "text-primary bg-primary/5 hover:bg-primary/20 border-1 border-primary/50"
        : "text-gray-600 hover:bg-gray-100",
    )}
  >
    {children}
  </button>
);

export default function ReactButtons({
  reactors,
  extendedScore,
  extendedVoteType,
  onReact,
  className,
}: Readonly<{
  reactors: Record<string, string[]> | null;
  extendedScore: Record<string, number>;
  extendedVoteType?: Record<string, boolean>;
  onReact: (reactionName: string) => void;
  className?: string;
}>) {
  const { currentUser } = useCurrentUser();
  const reactions = countCurrentReactions(extendedScore);
  return (
    <div className={clsx("flex items-center gap-[2px]", className)}>
      {reactions.map(({ reaction, score, anonymous }) => {
        const isSelected = isReactionSelected(extendedVoteType, reaction);
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
            <ReactionButton
              onClick={onReact.bind(null, reaction.name)}
              isSelected={isSelected}
            >
              <reaction.Component className="w-4 text-primary" />
              <Type style="reactScore">{score}</Type>
            </ReactionButton>
          </Tooltip>
        );
      })}
      <Dropdown
        menu={<ReactionPalette onReact={onReact} />}
        placement="bottom-start"
      >
        <Tooltip placement="top" title={<Type style="bodySmall">Add reaction</Type>}>
          <ReactionButton>
            <AddReactionIcon className="w-[18px]" />
          </ReactionButton>
        </Tooltip>
      </Dropdown>
    </div>
  );
}
