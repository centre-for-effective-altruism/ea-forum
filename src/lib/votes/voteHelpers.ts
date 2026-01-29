import { z } from "zod/v4";

export type VoteStrength = "big" | "small" | "neutral";

export type VoteDirection = "Upvote" | "Downvote";

export const voteTypeSchema = z.enum([
  "bigUpvote",
  "smallUpvote",
  "neutral",
  "smallDownvote",
  "bigDownvote",
]);

export type VoteType = z.infer<typeof voteTypeSchema>;

/**
 * Create a vote type from a vote strength and direction
 */
export const createVoteType = (str: VoteStrength, dir: VoteDirection): VoteType =>
  str === "neutral" ? str : `${str}${dir}`;

/**
 * If this is a downvote return it's strength, otherwise return neutral
 */
export const getVoteDownStrength = (t: VoteType): VoteStrength => {
  if (t.indexOf("Downvote") < 0) {
    return "neutral";
  }
  return t.indexOf("big") >= 0 ? "big" : "small";
};

/**
 * If this is an upvote return it's strength, otherwise return neutral
 */
export const getVoteUpStrength = (t: VoteType): VoteStrength => {
  if (t.indexOf("Upvote") < 0) {
    return "neutral";
  }
  return t.indexOf("big") >= 0 ? "big" : "small";
};

export const userSmallVotePower = (karma: number, multiplier: number) =>
  karma >= 1000 ? 2 * multiplier : multiplier;

const userBigVotePower = (karma: number, multiplier: number) => {
  if (karma >= 500000) {
    return 16 * multiplier;
  }
  if (karma >= 250000) {
    return 15 * multiplier;
  }
  if (karma >= 175000) {
    return 14 * multiplier;
  }
  if (karma >= 100000) {
    return 13 * multiplier;
  }
  if (karma >= 75000) {
    return 12 * multiplier;
  }
  if (karma >= 50000) {
    return 11 * multiplier;
  }
  if (karma >= 25000) {
    return 10 * multiplier;
  }
  if (karma >= 10000) {
    return 9 * multiplier;
  }
  if (karma >= 5000) {
    return 8 * multiplier;
  }
  if (karma >= 2500) {
    return 7 * multiplier;
  }
  if (karma >= 1000) {
    return 6 * multiplier;
  }
  if (karma >= 500) {
    return 5 * multiplier;
  }
  if (karma >= 250) {
    return 4 * multiplier;
  }
  if (karma >= 100) {
    return 3 * multiplier;
  }
  if (karma >= 10) {
    return 2 * multiplier;
  }
  return multiplier;
};

export const calculateVotePower = (karma: number, voteType: VoteType): number => {
  switch (voteType) {
    case "smallUpvote":
      return userSmallVotePower(karma, 1);
    case "smallDownvote":
      return userSmallVotePower(karma, -1);
    case "bigUpvote":
      return userBigVotePower(karma, 1);
    case "bigDownvote":
      return userBigVotePower(karma, -1);
    case "neutral":
      return 0;
    default:
      throw new Error(`Invalid vote type: ${voteType}`);
  }
};
