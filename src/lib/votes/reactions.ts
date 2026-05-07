import type { FC } from "react";
import TickReactionIcon from "@/components/Icons/Reactions/TickReactionIcon";
import CrossReactionIcon from "@/components/Icons/Reactions/CrossReactionIcon";
import HeartReactionIcon from "@/components/Icons/Reactions/HeartReactionIcon";
import HandshakeReactionIcon from "@/components/Icons/Reactions/HandshakeReactionIcon";
import LightbulbReactionIcon from "@/components/Icons/Reactions/LightbulbReactionIcon";
import DeltaReactionIcon from "@/components/Icons/Reactions/DeltaReactionIcon";
import LaughReactionIcon from "@/components/Icons/Reactions/LaughReactionIcon";

export type ReactionOption = {
  Component: FC<{ className?: string }>;
  name: string;
  label: string;
  isNegative?: boolean;
};

export const anonymousReactionPalette: ReactionOption[] = [
  {
    Component: TickReactionIcon,
    name: "agree",
    label: "Agree",
  },
  {
    Component: CrossReactionIcon,
    name: "disagree",
    label: "Disagree",
    isNegative: true,
  },
];

export const publicReactionPalette: ReactionOption[] = [
  {
    Component: HeartReactionIcon,
    name: "love",
    label: "Heart",
  },
  {
    Component: HandshakeReactionIcon,
    name: "helpful",
    label: "Helpful",
  },
  {
    Component: LightbulbReactionIcon,
    name: "insightful",
    label: "Insightful",
  },
  {
    Component: DeltaReactionIcon,
    name: "changed-mind",
    label: "Changed my mind",
  },
  {
    Component: LaughReactionIcon,
    name: "laugh",
    label: "Made me laugh",
  },
];

export const allReactionNames = [
  ...anonymousReactionPalette,
  ...publicReactionPalette,
].map(({ name }) => name);

export const getReactionByName = (name: string): ReactionOption | null => {
  for (const reaction of anonymousReactionPalette) {
    if (reaction.name === name) {
      return reaction;
    }
  }
  for (const reaction of publicReactionPalette) {
    if (reaction.name === name) {
      return reaction;
    }
  }
  return null;
};

export const countCurrentReactions = (
  extendedScore: Record<string, number> | null,
) => {
  const result = [];
  for (const reaction of anonymousReactionPalette) {
    result.push({
      reaction,
      score: extendedScore?.[reaction.name] ?? 0,
      anonymous: true,
    });
  }
  if (!extendedScore || !Object.keys(extendedScore).length) {
    return result;
  }
  for (const reaction of publicReactionPalette) {
    if ((extendedScore[reaction.name] ?? 0) > 0) {
      result.push({
        reaction,
        score: extendedScore[reaction.name],
        anonymous: false,
      });
    }
  }
  return result;
};

export const formatReactorNames = (names: string[]) =>
  names.length > 1
    ? names.slice(0, -1).join(", ") + ", and " + names[names.length - 1]
    : names[0];

export const isReactionSelected = (
  currentUserExtendedVote: Record<string, boolean> | null | undefined,
  reaction: ReactionOption,
) => Boolean(currentUserExtendedVote?.[reaction.name]);

export const getReactionMutuallyExclusivePartner = (reactionName: string) => {
  switch (reactionName) {
    case "agree":
      return "disagree";
    case "disagree":
      return "agree";
    default:
      return undefined;
  }
};

export const getReactionsForKarmaChanges = (showNegative: boolean) => ({
  publicEmojis: publicReactionPalette
    .filter(({ isNegative }) => showNegative || !isNegative)
    .map(({ name }) => name),
  privateEmojis: anonymousReactionPalette
    .filter(({ isNegative }) => showNegative || !isNegative)
    .map(({ name }) => name),
});
