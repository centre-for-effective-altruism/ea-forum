import type { FC } from "react";
import TickReactionIcon from "@/components/Icons/Reactions/TickReactionIcon";
import CrossReactionIcon from "@/components/Icons/Reactions/CrossReactionIcon";
import HeartReactionIcon from "@/components/Icons/Reactions/HeartReactionIcon";
import HandshakeReactionIcon from "@/components/Icons/Reactions/HandshakeReactionIcon";
import LightbulbReactionIcon from "@/components/Icons/Reactions/LightbulbReactionIcon";
import DeltaReactionIcon from "@/components/Icons/Reactions/DeltaReactionIcon";
import LaughReactionIcon from "@/components/Icons/Reactions/LaughReactionIcon";

export type ReactionOption = {
  Component: FC;
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
